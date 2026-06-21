import React, { useState } from 'react';
import { fetchInboxEmails, archiveEmails, deleteEmails, markEmailsAsRead, createGmailFilter } from '../services/gmail';
import type { GmailEmail } from '../services/gmail';
import { classifyEmails } from '../services/gemini';
import { getAutoCleanRules, addAutoCleanRule, addWhitelistedSender, getWhitelistedSenders } from '../services/storage';
import type { CleanupAction } from '../services/storage';
import { 
  Play, Shield, Trash2, Archive, Check, Sparkles, Filter, Eye, EyeOff, Loader2, Zap 
} from 'lucide-react';

interface SprintCleanerProps {
  accessToken: string;
  geminiKey: string;
  onActionLogged: (actionType: string, count: number) => void;
}

interface DisplayEmail extends GmailEmail {
  category?: 'personal' | 'newsletter' | 'notification' | 'clutter';
  reason?: string;
  animating?: 'archive' | 'delete' | 'read' | null;
}

export const SprintCleaner: React.FC<SprintCleanerProps> = ({
  accessToken,
  geminiKey,
  onActionLogged,
}) => {
  const [emails, setEmails] = useState<DisplayEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [activeCategory, setActiveCategory] = useState<'personal' | 'newsletter' | 'notification' | 'clutter' | 'all'>('all');
  const [showEmailDetails, setShowEmailDetails] = useState<Record<string, boolean>>({});
  const [autoSweptCount, setAutoSweptCount] = useState(0);

  const scanInbox = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setAutoSweptCount(0);
    
    try {
      setLoadingStep('Connecting to Gmail API...');
      const fetched = await fetchInboxEmails(accessToken, 25);
      
      if (fetched.length === 0) {
        setEmails([]);
        setLoadingStep('');
        setIsLoading(false);
        return;
      }

      setLoadingStep(`Analyzing ${fetched.length} emails with Gemini AI...`);
      
      const emailMetadata = fetched.map(e => ({
        id: e.id,
        sender: e.from,
        subject: e.subject,
        snippet: e.snippet
      }));

      const classifications = await classifyEmails(geminiKey, emailMetadata);
      
      // Match classifications back to email objects
      let analyzed: DisplayEmail[] = fetched.map(email => {
        const found = classifications.find(c => c.id === email.id);
        return {
          ...email,
          category: found?.category || 'personal',
          reason: found?.reason || 'Unclassified'
        };
      });

      // Filter out whitelisted senders
      const whitelist = getWhitelistedSenders();
      analyzed = analyzed.filter(email => !whitelist.includes(email.fromEmail));

      // Auto-apply cleanup rules
      const rules = getAutoCleanRules();
      const toArchive: string[] = [];
      const toDelete: string[] = [];
      const toRead: string[] = [];
      const remaining: DisplayEmail[] = [];

      analyzed.forEach(email => {
        const matchedRule = rules.find(r => r.email === email.fromEmail);
        if (matchedRule) {
          if (matchedRule.action === 'archive') toArchive.push(email.id);
          else if (matchedRule.action === 'delete') toDelete.push(email.id);
          else if (matchedRule.action === 'read') toRead.push(email.id);
        } else {
          remaining.push(email);
        }
      });

      let swept = 0;
      if (toArchive.length > 0) {
        setLoadingStep(`Auto-archiving ${toArchive.length} matching emails...`);
        await archiveEmails(accessToken, toArchive);
        swept += toArchive.length;
        onActionLogged('archive', toArchive.length);
      }
      if (toDelete.length > 0) {
        setLoadingStep(`Auto-deleting ${toDelete.length} matching emails...`);
        await deleteEmails(accessToken, toDelete);
        swept += toDelete.length;
        onActionLogged('delete', toDelete.length);
      }
      if (toRead.length > 0) {
        setLoadingStep(`Auto-reading ${toRead.length} matching emails...`);
        await markEmailsAsRead(accessToken, toRead);
        swept += toRead.length;
        onActionLogged('read', toRead.length);
      }

      setAutoSweptCount(swept);
      setEmails(remaining);
    } catch (e) {
      console.error(e);
      alert('An error occurred during scanning. Check console or API Keys.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleIndividualAction = async (id: string, action: CleanupAction) => {
    const email = emails.find(e => e.id === id);
    if (!email) return;

    // Trigger animation
    setEmails(prev => prev.map(e => e.id === id ? { ...e, animating: action } : e));

    setTimeout(async () => {
      try {
        if (action === 'archive') {
          await archiveEmails(accessToken, [id]);
          onActionLogged('archive', 1);
        } else if (action === 'delete') {
          await deleteEmails(accessToken, [id]);
          onActionLogged('delete', 1);
        } else if (action === 'read') {
          await markEmailsAsRead(accessToken, [id]);
          onActionLogged('read', 1);
        }
        setEmails(prev => prev.filter(e => e.id !== id));
      } catch (e) {
        console.error(e);
        // revert animation on error
        setEmails(prev => prev.map(e => e.id === id ? { ...e, animating: null } : e));
        alert('Failed to perform operation in Gmail.');
      }
    }, 300);
  };

  const handleBatchAction = async (category: 'personal' | 'newsletter' | 'notification' | 'clutter', action: CleanupAction) => {
    const targets = emails.filter(e => e.category === category);
    if (targets.length === 0) return;

    const ids = targets.map(t => t.id);

    // Trigger animation for all in batch
    setEmails(prev => prev.map(e => e.category === category ? { ...e, animating: action } : e));

    setTimeout(async () => {
      try {
        if (action === 'archive') {
          await archiveEmails(accessToken, ids);
          onActionLogged('archive', ids.length);
        } else if (action === 'delete') {
          await deleteEmails(accessToken, ids);
          onActionLogged('delete', ids.length);
        } else if (action === 'read') {
          await markEmailsAsRead(accessToken, ids);
          onActionLogged('read', ids.length);
        }
        setEmails(prev => prev.filter(e => e.category !== category));
      } catch (e) {
        console.error(e);
        setEmails(prev => prev.map(e => e.category === category ? { ...e, animating: null } : e));
        alert('Failed to execute batch operation.');
      }
    }, 400);
  };

  const createRule = async (email: string, senderName: string, action: CleanupAction) => {
    if (window.confirm(`Create auto-filter: Always auto-${action === 'read' ? 'mark read' : action} emails from "${senderName}" (${email})?`)) {
      try {
        await createGmailFilter(accessToken, email, action);
        addAutoCleanRule(email, action, senderName);
        alert(`Successfully created auto-cleanup rule. Senders matching ${email} will now be processed automatically on scan.`);
        // Clean remaining from workspace
        setEmails(prev => prev.filter(e => e.fromEmail !== email));
      } catch (e) {
        console.error(e);
        alert('Could not create filter. Do you have the setting scopes granted?');
      }
    }
  };

  const whitelistSender = (email: string) => {
    addWhitelistedSender(email);
    setEmails(prev => prev.filter(e => e.fromEmail !== email));
  };

  const toggleDetails = (id: string) => {
    setShowEmailDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categorizedEmails = emails.filter(e => activeCategory === 'all' || e.category === activeCategory);
  
  const categories = [
    { id: 'all', name: 'All Inbox', color: 'var(--text-primary)', count: emails.length },
    { id: 'personal', name: 'Important', color: 'var(--color-personal)', count: emails.filter(e => e.category === 'personal').length },
    { id: 'newsletter', name: 'Newsletters', color: 'var(--color-newsletter)', count: emails.filter(e => e.category === 'newsletter').length },
    { id: 'notification', name: 'Notifications', color: 'var(--color-notification)', count: emails.filter(e => e.category === 'notification').length },
    { id: 'clutter', name: 'Clutter', color: 'var(--color-clutter)', count: emails.filter(e => e.category === 'clutter').length },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Actions / Info Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px', textAlign: 'left' }}>Inbox Cleanup Sprint</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Process emails in batches using Gemini AI. Nothing is removed without your permission.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {autoSweptCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <Zap size={14} />
              <span><b>{autoSweptCount}</b> emails auto-swept!</span>
            </div>
          )}
          
          <button 
            id="scan-inbox-btn"
            onClick={scanInbox} 
            disabled={isLoading || !accessToken}
            className="btn-primary"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>{loadingStep || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Play size={16} /> Scan Inbox (Latest 25)
              </>
            )}
          </button>
        </div>
      </div>

      {emails.length === 0 && !isLoading ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Shield size={48} style={{ color: 'var(--accent-purple)', marginBottom: '16px', opacity: 0.8 }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Your Inbox is Clean!</h2>
          <p style={{ maxWidth: '400px', margin: '0 auto 20px', fontSize: '14px' }}>
            Click the scan button above to pull the latest 25 emails from your inbox and analyze them.
          </p>
        </div>
      ) : (
        <>
          {/* Category Selector Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {categories.map(cat => (
              <div 
                id={`cat-card-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className="glass-card-interactive"
                style={{ 
                  padding: '16px', 
                  borderLeft: `4px solid ${cat.color}`,
                  borderBottomColor: activeCategory === cat.id ? 'var(--accent-purple)' : 'var(--border-glass)',
                  background: activeCategory === cat.id ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading)', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  {cat.count}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>emails</span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Category Actions Bar */}
          {activeCategory !== 'all' && activeCategory !== 'personal' && emails.filter(e => e.category === activeCategory).length > 0 && (
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--accent-purple-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-purple)' }} />
                <span style={{ fontSize: '14px' }}>
                  AI recommends cleaning this <b>{activeCategory}</b> bundle. Select a batch action:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  id={`batch-archive-${activeCategory}`}
                  onClick={() => handleBatchAction(activeCategory, 'archive')}
                  className="btn-secondary" 
                  style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  <Archive size={14} /> Archive All
                </button>
                <button 
                  id={`batch-delete-${activeCategory}`}
                  onClick={() => handleBatchAction(activeCategory, 'delete')}
                  className="btn-secondary" 
                  style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', padding: '6px 12px', color: 'var(--color-clutter)' }}
                >
                  <Trash2 size={14} /> Delete All
                </button>
                <button 
                  id={`batch-read-${activeCategory}`}
                  onClick={() => handleBatchAction(activeCategory, 'read')}
                  className="btn-secondary" 
                  style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
                >
                  <Check size={14} /> Mark All Read
                </button>
              </div>
            </div>
          )}

          {/* Email Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categorizedEmails.map(email => {
              const showDetail = showEmailDetails[email.id];
              let animClass = '';
              if (email.animating === 'archive') animClass = 'swipe-archive';
              else if (email.animating === 'delete') animClass = 'swipe-delete';
              
              return (
                <div 
                  id={`email-row-${email.id}`}
                  key={email.id}
                  className={`glass-panel ${animClass}`}
                  style={{ 
                    padding: '16px',
                    borderLeft: `4px solid var(--color-${email.category || 'personal'})`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${email.category}`}>
                          {email.category}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {email.fromName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          &lt;{email.fromEmail}&gt;
                        </span>
                      </div>
                      
                      <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {email.subject}
                      </h3>
                      
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {email.snippet}
                      </p>
                      
                      {email.reason && (
                        <div style={{ fontSize: '11px', color: 'var(--accent-purple)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={11} />
                          <span>{email.reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Individual Row Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => toggleDetails(email.id)}
                        className="btn-secondary" 
                        style={{ padding: '6px 10px' }}
                        title={showDetail ? 'Hide Details' : 'View Details'}
                      >
                        {showDetail ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      
                      {email.category !== 'personal' && (
                        <>
                          <button 
                            onClick={() => handleIndividualAction(email.id, 'archive')}
                            className="btn-secondary" 
                            style={{ padding: '6px 10px', color: 'var(--accent-blue)' }}
                            title="Archive"
                          >
                            <Archive size={14} />
                          </button>
                          
                          <button 
                            onClick={() => handleIndividualAction(email.id, 'delete')}
                            className="btn-secondary" 
                            style={{ padding: '6px 10px', color: 'var(--color-clutter)' }}
                            title="Trash"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}

                      {email.category === 'personal' && (
                        <button 
                          onClick={() => handleIndividualAction(email.id, 'read')}
                          className="btn-secondary" 
                          style={{ padding: '6px 10px', color: '#10b981' }}
                          title="Keep & Mark Read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {showDetail && (
                    <div className="animate-fade-in" style={{ marginTop: '16px', padding: '16px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px', marginBottom: '12px' }}>
                        <div>Date:</div>
                        <div style={{ color: 'var(--text-primary)' }}>{email.date}</div>
                        <div>Snippet:</div>
                        <div style={{ color: 'var(--text-primary)' }}>{email.snippet}</div>
                      </div>

                      {/* Rule & Whitelist Options */}
                      {email.category !== 'personal' && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '12px' }}>
                          <button 
                            onClick={() => createRule(email.fromEmail, email.fromName, 'archive')}
                            className="btn-secondary" 
                            style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Filter size={11} /> Auto-Archive Rule
                          </button>
                          <button 
                            onClick={() => createRule(email.fromEmail, email.fromName, 'delete')}
                            className="btn-secondary" 
                            style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--color-clutter)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={11} /> Auto-Delete Rule
                          </button>
                          <button 
                            onClick={() => whitelistSender(email.fromEmail)}
                            className="btn-secondary" 
                            style={{ fontSize: '11px', padding: '6px 12px', color: 'var(--color-newsletter)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Shield size={11} /> Whitelist Sender
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
