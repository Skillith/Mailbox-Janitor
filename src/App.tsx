import { useState, useEffect } from 'react';
import { 
  getGeminiKey, 
  getGoogleClientId, 
  incrementMetric,
  getAutopilotEnabled,
  getAutopilotInterval,
  getAutopilotRules,
  getProcessedEmails,
  addProcessedEmail,
  getWhitelistedSenders,
  getAutoCleanRules,
  addAutopilotLog 
} from './services/storage';
import { loadGoogleScripts, initGoogleAuth, loginGoogle, logoutGoogle, refreshGoogleTokenSilently } from './services/googleAuth';
import { fetchInboxEmails, archiveEmails, deleteEmails, markEmailsAsRead } from './services/gmail';
import { classifyEmails } from './services/gemini';
import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { AutoPilot } from './components/AutoPilot';
import { Key, ShieldAlert, LogIn, X } from 'lucide-react';

function App() {
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  
  const [isAutopilotActive, setIsAutopilotActive] = useState<boolean>(false);
  const [isAutopilotScanning, setIsAutopilotScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [tokenExpiryTime, setTokenExpiryTime] = useState<number>(0);

  // 1. Load keys from storage on mount
  const loadKeys = () => {
    const key = getGeminiKey();
    const id = getGoogleClientId();
    setGeminiKey(key);
    setClientId(id);
    
    // Open settings modal if keys are not configured
    if (!key || !id) {
      setShowSettingsModal(true);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // 2. Load Google GIS script dynamically
  useEffect(() => {
    loadGoogleScripts()
      .then(() => {
        setIsScriptLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setAuthError('Failed to load Google Sign-In script. Check adblockers or network connection.');
      });
  }, []);

  // 3. Initialize OAuth Client when Client ID or script changes
  useEffect(() => {
    if (isScriptLoaded && clientId) {
      setAuthError('');
      
      initGoogleAuth(
        clientId,
        (response) => {
          setAccessToken(response.access_token);
          setTokenExpiryTime(Date.now() + (response.expires_in || 3600) * 1000);
          fetchUserProfile(response.access_token);
          setAuthError('');
        },
        (error) => {
          console.error('OAuth Client Error:', error);
          setAuthError('Authentication client initialization failed. Verify your Client ID.');
        }
      );
    }
  }, [isScriptLoaded, clientId]);

  // Fetch Gmail user profile to show logged in state
  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.emailAddress || '');
      }
    } catch (e) {
      console.error('Error fetching user profile:', e);
    }
  };

  // Initialize Auto-Pilot status
  useEffect(() => {
    setIsAutopilotActive(getAutopilotEnabled());
  }, []);

  const runAutopilotScan = async () => {
    if (!accessToken || !geminiKey || isAutopilotScanning) return;
    
    // Check if token is expired or close to expiring (within 2 minutes)
    const isTokenExpiring = tokenExpiryTime > 0 && (Date.now() + 120000 >= tokenExpiryTime);
    if (isTokenExpiring) {
      addAutopilotLog('OAuth access token is expiring soon. Initiating silent refresh...', 'info');
      refreshGoogleTokenSilently();
      setIsAutopilotScanning(false);
      return;
    }
    
    setIsAutopilotScanning(true);
    setLastScanTime(Date.now());
    
    addAutopilotLog('Scanning inbox...', 'info');
    
    try {
      const fetched = await fetchInboxEmails(accessToken, 20);
      if (fetched.length === 0) {
        addAutopilotLog('Inbox is empty. No emails to process.', 'info');
        setIsAutopilotScanning(false);
        return;
      }

      const processedIds = getProcessedEmails();
      const whitelist = getWhitelistedSenders();
      
      const unreadEmails = fetched.filter(email => {
        const isUnread = email.labelIds?.includes('UNREAD');
        const isProcessed = processedIds.includes(email.id);
        const isWhitelisted = whitelist.includes(email.fromEmail);
        return isUnread && !isProcessed && !isWhitelisted;
      });

      if (unreadEmails.length === 0) {
        addAutopilotLog('No new unread or unprocessed emails found.', 'info');
        setIsAutopilotScanning(false);
        return;
      }

      addAutopilotLog(`Found ${unreadEmails.length} new unread email(s). Classifying...`, 'info');

      const emailMetadata = unreadEmails.map(e => ({
        id: e.id,
        sender: e.from,
        subject: e.subject,
        snippet: e.snippet
      }));

      const classifications = await classifyEmails(geminiKey, emailMetadata);
      
      const rules = getAutopilotRules();
      const autoCleanRules = getAutoCleanRules();

      const toArchive: string[] = [];
      const toDelete: string[] = [];
      const toRead: string[] = [];

      for (const email of unreadEmails) {
        const classification = classifications.find(c => c.id === email.id);
        const category = classification?.category || 'personal';
        const reason = classification?.reason || 'Unclassified';
        
        addProcessedEmail(email.id);

        const matchedSenderRule = autoCleanRules.find(r => r.email === email.fromEmail);
        if (matchedSenderRule) {
          const action = matchedSenderRule.action;
          addAutopilotLog(`Matched custom rule for "${email.fromName}": Auto-${action}`, 'success');
          if (action === 'archive') toArchive.push(email.id);
          else if (action === 'delete') toDelete.push(email.id);
          else if (action === 'read') toRead.push(email.id);
          continue;
        }

        const ruleAction = rules[category];
        if (!ruleAction || ruleAction === 'ignore') {
          addAutopilotLog(`"${email.fromName}" classified as ${category} (${reason}). Action: KEPT`, 'info');
          continue;
        }

        addAutopilotLog(`"${email.fromName}" classified as ${category} (${reason}). Action: ${ruleAction.toUpperCase()}`, 'success');
        
        if (ruleAction === 'archive') toArchive.push(email.id);
        else if (ruleAction === 'delete') toDelete.push(email.id);
        else if (ruleAction === 'read') toRead.push(email.id);
      }

      if (toArchive.length > 0) {
        await archiveEmails(accessToken, toArchive);
        handleActionLogged('archive', toArchive.length);
      }
      if (toDelete.length > 0) {
        await deleteEmails(accessToken, toDelete);
        handleActionLogged('delete', toDelete.length);
      }
      if (toRead.length > 0) {
        await markEmailsAsRead(accessToken, toRead);
        handleActionLogged('read', toRead.length);
      }

      const totalCleaned = toArchive.length + toDelete.length + toRead.length;
      addAutopilotLog(`Scan complete. Processed ${unreadEmails.length} email(s), cleaned ${totalCleaned}.`, 'success');

    } catch (error: any) {
      console.error('Auto-Pilot error:', error);
      addAutopilotLog(`Scan failed: ${error.message || error}`, 'error');
      
      const errStr = String(error.message || error).toLowerCase();
      if (errStr.includes('401') || errStr.includes('unauthorized') || errStr.includes('invalid credentials')) {
        addAutopilotLog('Authentication error detected. Attempting silent token refresh...', 'warn');
        refreshGoogleTokenSilently();
      }
    } finally {
      setIsAutopilotScanning(false);
    }
  };

  // Background Loop Effect
  useEffect(() => {
    if (!isAutopilotActive || !accessToken || !geminiKey) return;

    const interval = getAutopilotInterval();
    const now = Date.now();
    
    // Scan immediately if we haven't run recently
    if (now - lastScanTime >= interval) {
      runAutopilotScan();
    }

    const timer = setInterval(() => {
      const currentInterval = getAutopilotInterval();
      const currentNow = Date.now();
      if (currentNow - lastScanTime >= currentInterval) {
        runAutopilotScan();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [isAutopilotActive, accessToken, geminiKey, lastScanTime]);

  const handleLogin = () => {
    try {
      loginGoogle();
    } catch (e: any) {
      setAuthError(e.message || 'Login flow failed.');
    }
  };

  const handleLogout = () => {
    logoutGoogle(accessToken);
    setAccessToken('');
    setUserEmail('');
  };

  const handleActionLogged = (type: string, count: number) => {
    incrementMetric(type as any, count);
  };

  const isConfigured = !!geminiKey && !!clientId;
  const isAuthenticated = !!accessToken;

  // Render active tab view
  const renderTabContent = () => {
    if (!isConfigured) {
      return (
        <div style={{ maxWidth: '640px', margin: '40px auto 0' }}>
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--accent-purple-glow)' }}>
            <Key size={48} style={{ color: 'var(--accent-purple)', marginBottom: '16px' }} />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '22px' }}>API Configuration Required</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Welcome to Mailbox Janitor! To start scanning and cleaning your emails with AI, please configure your private Gemini API Key and Google Client ID.
            </p>
            <button onClick={() => setShowSettingsModal(true)} className="btn-primary" style={{ padding: '12px 24px' }}>
              Configure API Credentials
            </button>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="glass-panel" style={{ padding: '48px', maxWidth: '560px', margin: '60px auto 0', textAlign: 'center' }}>
          <div style={{ 
            fontSize: '40px', 
            background: 'rgba(168, 85, 247, 0.1)', 
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            marginBottom: '20px'
          }}>
            🧹
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Unlock Your Janitor</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            We've loaded your configuration. Now authorize Mailbox Janitor to securely scan and clean your inbox using your own Google credentials.
          </p>

          {authError && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '13px', 
              color: 'var(--color-clutter)',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'left'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{authError}</span>
            </div>
          )}

          <button 
            id="google-login-large-btn"
            onClick={handleLogin} 
            className="btn-primary" 
            style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '15px' }}
          >
            <LogIn size={18} /> Sign In with Google Credentials
          </button>
        </div>
      );
    }

    return (
      <AutoPilot 
        geminiKey={geminiKey} 
        isAutopilotActive={isAutopilotActive} 
        setIsAutopilotActive={setIsAutopilotActive} 
        onForceScan={runAutopilotScan}
        isScanning={isAutopilotScanning}
      />
    );
  };

  return (
    <div className="layout-container">
      
      {/* App Header */}
      <Navbar 
        isConfigured={isConfigured} 
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Area */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {renderTabContent()}
      </main>

      {/* Settings Modal Dialog Overlay */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 4, 15, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <button
              onClick={() => setShowSettingsModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              className="btn-hover-indicator"
            >
              <X size={18} />
            </button>
            
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              API Credentials
            </h2>
            
            <SettingsPanel onSaved={() => {
              loadKeys();
              setShowSettingsModal(false);
            }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-glass)', 
        padding: '20px 0', 
        textAlign: 'center', 
        fontSize: '12px', 
        color: 'var(--text-muted)',
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>Mailbox Janitor &copy; 2026. Released under the MIT License.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub Project</a>
          <span>&bull;</span>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
