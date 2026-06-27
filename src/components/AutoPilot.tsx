import React, { useState, useEffect, useRef } from 'react';
import { 
  setAutopilotEnabled, 
  getAutopilotInterval, 
  setAutopilotInterval, 
  getAutopilotRules, 
  setAutopilotRules, 
  getAutopilotLogs, 
  clearAutopilotLogs, 
  clearProcessedEmails,
} from '../services/storage';
import type { 
  AutopilotLog, 
  AutopilotAction, 
  AutopilotRules 
} from '../services/storage';
import { 
  Zap, Settings, Trash2, Copy, ExternalLink, Code, Terminal, Check, Loader2, Play, Square, AlertCircle, RefreshCw
} from 'lucide-react';

interface AutoPilotProps {
  geminiKey: string;
  isAutopilotActive: boolean;
  setIsAutopilotActive: (active: boolean) => void;
  onForceScan: () => Promise<void>;
  isScanning: boolean;
}

export const AutoPilot: React.FC<AutoPilotProps> = ({
  geminiKey,
  isAutopilotActive,
  setIsAutopilotActive,
  onForceScan,
  isScanning,
}) => {
  const [intervalTime, setIntervalTime] = useState<number>(60000);
  const [rules, setRules] = useState<AutopilotRules>({ personal: 'ignore', newsletter: 'read', notification: 'ignore', clutter: 'archive' });
  const [logs, setLogs] = useState<AutopilotLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'gas' | 'n8n'>('gas');
  const [copied, setCopied] = useState<boolean>(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Load initial settings
  useEffect(() => {
    setIntervalTime(getAutopilotInterval());
    setRules(getAutopilotRules());
    setLogs(getAutopilotLogs());
  }, []);

  // Poll for log updates
  useEffect(() => {
    const logInterval = setInterval(() => {
      setLogs(getAutopilotLogs());
    }, 1500);
    return () => clearInterval(logInterval);
  }, []);

  // Scroll terminal to bottom when logs change
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs]);

  const handleToggleActive = () => {
    const nextState = !isAutopilotActive;
    setIsAutopilotActive(nextState);
    setAutopilotEnabled(nextState);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setIntervalTime(val);
    setAutopilotInterval(val);
  };

  const handleRuleChange = (category: keyof AutopilotRules, action: AutopilotAction) => {
    const updated = { ...rules, [category]: action };
    setRules(updated);
    setAutopilotRules(updated);
  };

  const handleClearLogs = () => {
    if (window.confirm('Clear all Auto-Pilot activity logs?')) {
      clearAutopilotLogs();
      setLogs([]);
    }
  };

  const handleClearProcessedCache = () => {
    if (window.confirm('Reset processed email cache? Auto-Pilot will re-evaluate recent emails on the next scan.')) {
      clearProcessedEmails();
      alert('Cache reset. Auto-Pilot will evaluate all unread inbox items in the next run.');
    }
  };

  const handleCopyLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google Apps Script Code
  const gasCode = `/**
 * Mailbox Janitor - 24/7 Headless Gmail AI Auto-Pilot
 * Deploy this script to Google Apps Script (script.google.com) to clean your mailbox automatically.
 */

const GEMINI_API_KEY = "${geminiKey || 'YOUR_GEMINI_API_KEY'}";
const RULES = {
  newsletter: "${rules.newsletter}",   // options: 'read', 'archive', 'delete', 'ignore'
  notification: "${rules.notification}", // options: 'read', 'archive', 'delete', 'ignore'
  clutter: "${rules.clutter}"       // options: 'read', 'archive', 'delete', 'ignore'
};

function autoPilotJanitor() {
  Logger.log("Starting Auto-Pilot scan...");
  
  // 1. Fetch latest 20 unread emails in Inbox
  const threads = GmailApp.search("label:UNREAD label:INBOX", 0, 20);
  if (threads.length === 0) {
    Logger.log("No unread emails found.");
    return;
  }
  
  // 2. Prepare metadata for AI
  const emailsToClassify = [];
  const threadMap = {};
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    const lastMsg = messages[messages.length - 1]; // process latest message in thread
    
    if (lastMsg.isUnread()) {
      const id = lastMsg.getId();
      threadMap[id] = thread;
      emailsToClassify.push({
        id: id,
        sender: lastMsg.getFrom(),
        subject: lastMsg.getSubject(),
        snippet: lastMsg.getPlainBody().substring(0, 300)
      });
    }
  });
  
  if (emailsToClassify.length === 0) return;
  
  // 3. Classify with Gemini 2.5 Flash
  try {
    const classifications = classifyWithGemini(emailsToClassify);
    
    // 4. Apply Cleanup Rules based on classification
    classifications.forEach(item => {
      const thread = threadMap[item.id];
      if (!thread) return;
      
      const action = RULES[item.category];
      if (!action || action === 'ignore') {
        Logger.log("Email '" + item.id + "' classified as " + item.category + ". Action: IGNORE");
        return;
      }
      
      Logger.log("Email '" + item.id + "' classified as " + item.category + ". Action: " + action.toUpperCase() + " (Reason: " + item.reason + ")");
      
      if (action === 'read') {
        thread.markRead();
      } else if (action === 'archive') {
        thread.markRead();
        thread.moveToArchive();
      } else if (action === 'delete') {
        thread.markRead();
        thread.moveToTrash();
      }
    });
  } catch (e) {
    Logger.log("Classification failed: " + e.toString());
  }
}

function classifyWithGemini(emails) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
  
  const prompt = "Classify the following emails into one of these categories: 'personal', 'newsletter', 'notification', 'clutter'.\\n" +
    "For each email, output a JSON object containing: id, category, reason, confidence.\\n\\n" +
    "Input emails:\\n" + JSON.stringify(emails, null, 2) + "\\n\\n" +
    "Return a raw JSON array of these classification objects.";
    
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const text = response.getContentText();
  
  if (response.getResponseCode() !== 200) {
    throw new Error("Gemini API error: " + text);
  }
  
  return JSON.parse(text).candidates[0].content.parts[0].text;
}`;

  const copyGASCode = () => {
    navigator.clipboard.writeText(gasCode);
    alert('Google Apps Script copied to clipboard!');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Active Banner & Control Switch */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '20px',
          borderLeft: isAutopilotActive ? '4px solid #10b981' : '1px solid var(--border-glass)',
          boxShadow: isAutopilotActive ? '0 0 20px rgba(16, 185, 129, 0.1)' : 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            background: isAutopilotActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isAutopilotActive ? '#10b981' : 'var(--text-muted)',
            padding: '14px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isAutopilotActive ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none'
          }} className={isAutopilotActive ? 'animate-pulse' : ''}>
            <Zap size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '4px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Auto-Pilot Agent
              <span className="badge" style={{ 
                background: isAutopilotActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                color: isAutopilotActive ? '#6ee7b7' : 'var(--text-muted)',
                fontSize: '11px',
                border: isAutopilotActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)',
              }}>
                {isAutopilotActive ? 'Active' : 'Stopped'}
              </span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Automatically scans and processes incoming emails based on category classifications.
            </p>
          </div>
        </div>

        {/* Master Control Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAutopilotActive && (
            <button
              onClick={onForceScan}
              disabled={isScanning}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Force scan now"
            >
              {isScanning ? (
                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw size={14} />
              )}
              Scan Now
            </button>
          )}

          <button
            onClick={handleToggleActive}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              background: isAutopilotActive ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              boxShadow: isAutopilotActive ? '0 4px 15px rgba(16, 185, 129, 0.25)' : '0 4px 15px rgba(168, 85, 247, 0.25)'
            }}
          >
            {isAutopilotActive ? (
              <>
                <Square size={16} fill="white" /> Pause Auto-Pilot
              </>
            ) : (
              <>
                <Play size={16} fill="white" /> Activate Auto-Pilot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules & Configuration Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Rules Config Panel */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--accent-purple)' }} />
            Auto-Pilot Settings
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Newsletters Rule */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className="badge badge-newsletter">Newsletters</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Subscriptions, digests, reading material</p>
              </div>
              <select 
                className="glass-input" 
                value={rules.newsletter} 
                onChange={(e) => handleRuleChange('newsletter', e.target.value as AutopilotAction)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="ignore">Ignore (Keep in Inbox)</option>
                <option value="read">Auto-Mark as Read</option>
                <option value="archive">Auto-Archive</option>
                <option value="delete">Auto-Delete (Trash)</option>
              </select>
            </div>

            {/* Notifications Rule */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className="badge badge-notification">Notifications</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Logins, receipts, tool alerts (Slack, GitHub)</p>
              </div>
              <select 
                className="glass-input" 
                value={rules.notification} 
                onChange={(e) => handleRuleChange('notification', e.target.value as AutopilotAction)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="ignore">Ignore (Keep in Inbox)</option>
                <option value="read">Auto-Mark as Read</option>
                <option value="archive">Auto-Archive</option>
                <option value="delete">Auto-Delete (Trash)</option>
              </select>
            </div>

            {/* Clutter Rule */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className="badge badge-clutter">Low-Value Clutter</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Cold outreach pitches, ads, bulk promos</p>
              </div>
              <select 
                className="glass-input" 
                value={rules.clutter} 
                onChange={(e) => handleRuleChange('clutter', e.target.value as AutopilotAction)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="ignore">Ignore (Keep in Inbox)</option>
                <option value="read">Auto-Mark as Read</option>
                <option value="archive">Auto-Archive</option>
                <option value="delete">Auto-Delete (Trash)</option>
              </select>
            </div>

            {/* Important Rule */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-glass)' }}>
              <div>
                <span className="badge badge-personal">Important / Personal</span>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Correspondence with actual people</p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginRight: '12px' }}>
                Always kept in inbox
              </span>
            </div>

            {/* Polling Interval Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Polling Scan Interval</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>How frequently the background worker runs</p>
              </div>
              <select 
                className="glass-input" 
                value={intervalTime} 
                onChange={handleIntervalChange}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="30000">Every 30 Seconds</option>
                <option value="60000">Every 1 Minute</option>
                <option value="300000">Every 5 Minutes</option>
                <option value="600000">Every 10 Minutes</option>
                <option value="1800000">Every 30 Minutes</option>
                <option value="3600000">Every 1 Hour</option>
                <option value="14400000">Every 4 Hours</option>
                <option value="28800000">Every 8 Hours</option>
                <option value="43200000">Every 12 Hours</option>
                <option value="86400000">Every 24 Hours</option>
              </select>
            </div>

            {/* Cache Reset Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <div>
                <h3 style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Processed Cache</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Mailbox Janitor caches evaluated email IDs</p>
              </div>
              <button 
                onClick={handleClearProcessedCache}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}
              >
                Clear Email Cache
              </button>
            </div>

          </div>
        </div>

        {/* Live Activity Terminal */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '400px' }}>
          
          {/* Terminal Headers */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} style={{ color: '#10b981' }} />
              Live Activity Console
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleCopyLogs}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                disabled={logs.length === 0}
              >
                {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Logs'}
              </button>
              <button 
                onClick={handleClearLogs}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-clutter)' }}
                disabled={logs.length === 0}
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div 
            ref={terminalRef}
            style={{ 
              flex: 1, 
              background: '#04030d', 
              borderRadius: '10px', 
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowY: 'auto',
              lineHeight: '1.6',
              color: '#a7f3d0',
              textAlign: 'left'
            }}
          >
            <div>[SYSTEM] Mailbox Janitor Auto-Pilot Daemon Initialized.</div>
            {isAutopilotActive && <div>[SYSTEM] Daemon active. Periodically scanning inbox...</div>}
            
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '10px' }}>
                No events recorded yet. Turn on Auto-Pilot or send a new email.
              </div>
            ) : (
              logs.slice().reverse().map((log) => {
                let color = '#a7f3d0'; // Light emerald
                if (log.type === 'success') color = '#34d399'; // Strong emerald
                else if (log.type === 'warn') color = '#fbbf24'; // Amber
                else if (log.type === 'error') color = '#f87171'; // Red
                else if (log.type === 'info') color = '#93c5fd'; // Soft blue

                return (
                  <div key={log.id} style={{ color, display: 'flex', gap: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{log.timestamp}]</span>
                    <span>{log.text}</span>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Headless 24/7 Setup Guide */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '12px' }}>
        <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={20} style={{ color: 'var(--accent-blue)' }} />
          Headless & 24/7 Deployment Options
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          To run this automation 24/7 in the cloud without keeping your browser tab open, you can deploy a free background script using Google Apps Script.
        </p>

        {/* Sub-tab selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveSubTab('gas')}
            style={{
              padding: '6px 12px',
              background: activeSubTab === 'gas' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              borderRadius: '6px',
              border: activeSubTab === 'gas' ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
              color: activeSubTab === 'gas' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Google Apps Script (Recommended)
          </button>
          <button
            onClick={() => setActiveSubTab('n8n')}
            style={{
              padding: '6px 12px',
              background: activeSubTab === 'n8n' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              borderRadius: '6px',
              border: activeSubTab === 'n8n' ? '1px solid rgba(59, 130, 246, 0.2)' : 'none',
              color: activeSubTab === 'n8n' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            n8n Automation Workflow
          </button>
        </div>

        {activeSubTab === 'gas' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <b>Steps to Setup Google Apps Script:</b>
              <ol style={{ paddingLeft: '20px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Go to <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>script.google.com <ExternalLink size={12} style={{ display: 'inline' }} /></a> and sign in with your Gmail account.</li>
                <li>Click <b>New Project</b> and replace the default code with the script below.</li>
                <li>Click the **Save** icon, then click <b>Run</b> to test it. It will ask for permissions to access your Gmail—approve it.</li>
                <li>To automate it: click the clock icon on the left sidebar (<b>Triggers</b>), click <b>Add Trigger</b>, set the function to <code style={{ color: 'var(--accent-purple)' }}>autoPilotJanitor</code>, choose trigger source <b>Time-driven</b>, and set the timer (e.g. every 5 minutes or hourly).</li>
              </ol>
            </div>
            
            <div style={{ position: 'relative', marginTop: '8px' }}>
              <button 
                onClick={copyGASCode}
                className="btn-secondary" 
                style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  fontSize: '11px', 
                  padding: '6px 12px',
                  zIndex: 2,
                  background: 'rgba(30, 30, 30, 0.8)'
                }}
              >
                Copy Code
              </button>
              <pre style={{ 
                background: '#04030d', 
                borderRadius: '10px', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px',
                fontSize: '12px',
                overflowX: 'auto',
                fontFamily: 'monospace',
                color: '#e2e8f0',
                maxHeight: '260px',
                textAlign: 'left'
              }}>
                <code>{gasCode}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p>
              If you self-host <b>n8n</b> or use <b>n8n cloud</b>, you can build a workflow using the Google OAuth2 node and a Gemini node:
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <li>Create a **Schedule Trigger** set to run every 1-5 minutes.</li>
              <li>Add a **Gmail Node** (Operation: <i>Get Messages</i>, Query: <code style={{ color: 'var(--accent-purple)' }}>label:INBOX label:UNREAD</code>).</li>
              <li>Add a **Google Gemini Node** using the model <code style={{ color: 'var(--accent-purple)' }}>gemini-2.5-flash</code>. Provide the schema prompt to classify messages into `personal`, `newsletter`, `notification`, or `clutter`.</li>
              <li>Add a **Switch Node** that filters messages based on the classification category and your preferred cleanup actions.</li>
              <li>Add another **Gmail Node** (Operation: <i>Modify Labels</i>) to remove the <code style={{ color: 'var(--accent-purple)' }}>UNREAD</code> or <code style={{ color: 'var(--accent-purple)' }}>INBOX</code> labels (Archiving) or move to trash.</li>
            </ol>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '12px', borderRadius: '8px', marginTop: '8px', color: '#93c5fd' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span><b>Note:</b> You will need to create a project in Google Cloud Console and set up OAuth credentials to authorize n8n to modify your inbox. Google Apps Script is much easier to set up for personal automation because it connects natively without manual OAuth configs!</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
