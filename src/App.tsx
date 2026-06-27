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
import { loadGoogleScripts, initGoogleAuth, loginGoogle, logoutGoogle } from './services/googleAuth';
import { fetchInboxEmails, archiveEmails, deleteEmails, markEmailsAsRead } from './services/gmail';
import { classifyEmails } from './services/gemini';
import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { SprintCleaner } from './components/SprintCleaner';
import { NewsletterDigest } from './components/NewsletterDigest';
import { RulesManager } from './components/RulesManager';
import { Analytics } from './components/Analytics';
import { AutoPilot } from './components/AutoPilot';
import { Key, ShieldAlert, LogIn } from 'lucide-react';

function App() {
  const [currentTab, setCurrentTab] = useState<string>('sprints');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  
  const [isAutopilotActive, setIsAutopilotActive] = useState<boolean>(false);
  const [isAutopilotScanning, setIsAutopilotScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  // 1. Load keys from storage on mount
  const loadKeys = () => {
    const key = getGeminiKey();
    const id = getGoogleClientId();
    setGeminiKey(key);
    setClientId(id);
    
    // Redirect to settings if keys are not configured
    if (!key || !id) {
      setCurrentTab('settings');
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
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', textAlign: 'center', borderColor: 'var(--accent-purple-glow)' }}>
            <Key size={32} style={{ color: 'var(--accent-purple)', marginBottom: '12px' }} />
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>Configure API Credentials</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Welcome to Mailbox Janitor! To analyze your emails with AI, please configure your private Gemini API Key and Google Client ID.
            </p>
          </div>
          <SettingsPanel onSaved={loadKeys} />
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

    switch (currentTab) {
      case 'sprints':
        return <SprintCleaner accessToken={accessToken} geminiKey={geminiKey} onActionLogged={handleActionLogged} />;
      case 'digest':
        return <NewsletterDigest accessToken={accessToken} geminiKey={geminiKey} onActionLogged={handleActionLogged} />;
      case 'rules':
        return <RulesManager />;
      case 'autopilot':
        return (
          <AutoPilot 
            geminiKey={geminiKey} 
            isAutopilotActive={isAutopilotActive} 
            setIsAutopilotActive={setIsAutopilotActive} 
            onForceScan={runAutopilotScan}
            isScanning={isAutopilotScanning}
          />
        );
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <SettingsPanel onSaved={loadKeys} />;
      default:
        return <SprintCleaner accessToken={accessToken} geminiKey={geminiKey} onActionLogged={handleActionLogged} />;
    }
  };

  return (
    <div className="layout-container">
      
      {/* Navbar always visible */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isConfigured={isConfigured} 
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isAutopilotActive={isAutopilotActive}
      />

      {/* Main Area */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {renderTabContent()}
      </main>

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
