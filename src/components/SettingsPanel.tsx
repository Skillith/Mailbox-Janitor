import React, { useState, useEffect } from 'react';
import { 
  getGeminiKey, 
  setGeminiKey, 
  getGoogleClientId, 
  setGoogleClientId, 
  clearAllSettings 
} from '../services/storage';
import { Key, Globe, Save, RefreshCw, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface SettingsPanelProps {
  onSaved: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSaved }) => {
  const [geminiKey, setGeminiKeyInput] = useState('');
  const [clientId, setClientIdInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setGeminiKeyInput(getGeminiKey());
    setClientIdInput(getGoogleClientId());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiKey(geminiKey);
    setGoogleClientId(clientId);
    setIsSaved(true);
    onSaved();
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all settings? This will delete your API keys from this browser.')) {
      clearAllSettings();
      setGeminiKeyInput('');
      setClientIdInput('');
      onSaved();
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
          <Key size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>API Configuration</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Credentials are stored strictly in your browser's local storage.</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="gemini-key" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Gemini API Key
          </label>
          <input
            id="gemini-key"
            type="password"
            className="glass-input"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={(e) => setGeminiKeyInput(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Used for email classification and summarization</span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-purple)', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
            >
              Get free Gemini Key <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="client-id" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Google Client ID
          </label>
          <input
            id="client-id"
            type="text"
            className="glass-input"
            placeholder="123456789-abc.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientIdInput(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Required for local Gmail API access</span>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', font: 'inherit' }}
            >
              How do I get this? <HelpCircle size={10} />
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="animate-fade-in" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} /> Google Cloud Setup Walkthrough
            </h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                Open the{' '}
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-purple)', textDecoration: 'underline' }}>
                  Google Cloud Console <ExternalLink size={10} />
                </a>.
              </li>
              <li>Create a new project (e.g., <b>Mailbox Janitor</b>).</li>
              <li>Go to <b>API Library</b>, search for <b>Gmail API</b>, and click <b>Enable</b>.</li>
              <li>
                Configure the <b>OAuth Consent Screen</b>:
                <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <li>Choose <b>External</b>, then fill in the App name.</li>
                  <li>Add the <code>.../auth/gmail.modify</code> and <code>.../auth/gmail.settings.basic</code> scopes.</li>
                  <li><b>CRITICAL:</b> In the "Test Users" page, add your own Gmail address (otherwise Google won't let you log in).</li>
                </ul>
              </li>
              <li>
                Create credentials under <b>Credentials</b> &gt; <b>Create Credentials</b> &gt; <b>OAuth client ID</b>:
                <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <li>Application type: <b>Web Application</b>.</li>
                  <li>Authorized JavaScript Origins: Add <code>http://localhost:5173</code> (and <code>http://127.0.0.1:5173</code>).</li>
                </ul>
              </li>
              <li>Copy the generated Client ID and paste it above!</li>
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button id="save-settings-btn" type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            <Save size={16} /> {isSaved ? 'Settings Saved!' : 'Save Credentials'}
          </button>
          <button id="clear-settings-btn" type="button" className="btn-secondary" onClick={handleClear}>
            <RefreshCw size={16} /> Clear Keys
          </button>
        </div>
      </form>

      <div style={{ marginTop: '24px', padding: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <ShieldCheck size={16} style={{ color: '#10b981' }} />
        <span><b>Privacy Guarantee:</b> All email contents are evaluated client-side and sent directly to Google APIs. We do not run any central servers, meaning your data stays yours.</span>
      </div>
    </div>
  );
};
