import React, { useState, useEffect } from 'react';
import { fetchInboxEmails, archiveEmails } from '../services/gmail';
import type { GmailEmail } from '../services/gmail';
import { classifyEmails } from '../services/gemini';
import { summarizeNewsletter } from '../services/gemini';
import { getWhitelistedSenders, addWhitelistedSender } from '../services/storage';
import { Mail, BookOpen, Sparkles, Archive, Shield, Loader2, RefreshCw, ChevronRight } from 'lucide-react';

interface NewsletterDigestProps {
  accessToken: string;
  geminiKey: string;
  onActionLogged: (actionType: string, count: number) => void;
}

export const NewsletterDigest: React.FC<NewsletterDigestProps> = ({
  accessToken,
  geminiKey,
  onActionLogged,
}) => {
  const [newsletters, setNewsletters] = useState<GmailEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<GmailEmail | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [isSummarizing, setIsSummarizing] = useState<Record<string, boolean>>({});

  const loadNewsletters = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const fetched = await fetchInboxEmails(accessToken, 30);
      
      if (fetched.length === 0) {
        setNewsletters([]);
        setIsLoading(false);
        return;
      }

      // Filter out whitelisted senders first
      const whitelist = getWhitelistedSenders();
      let candidates = fetched.filter(email => !whitelist.includes(email.fromEmail));

      // Use Gemini to identify newsletters specifically
      const emailMetadata = candidates.map(e => ({
        id: e.id,
        sender: e.from,
        subject: e.subject,
        snippet: e.snippet
      }));

      const classifications = await classifyEmails(geminiKey, emailMetadata);
      const newsletterIds = classifications
        .filter(c => c.category === 'newsletter')
        .map(c => c.id);

      const filteredNewsletters = candidates.filter(e => newsletterIds.includes(e.id));
      setNewsletters(filteredNewsletters);
      
      if (filteredNewsletters.length > 0) {
        setSelectedNewsletter(filteredNewsletters[0]);
      } else {
        setSelectedNewsletter(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load newsletters. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewsletters();
  }, [accessToken]);

  const handleSummarize = async (id: string, subject: string, snippet: string) => {
    if (!geminiKey) return;
    setIsSummarizing(prev => ({ ...prev, [id]: true }));
    try {
      const summaryText = await summarizeNewsletter(geminiKey, subject, snippet);
      setSummaries(prev => ({ ...prev, [id]: summaryText }));
    } catch (e) {
      console.error(e);
      setSummaries(prev => ({ ...prev, [id]: 'Failed to generate summary.' }));
    } finally {
      setIsSummarizing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveEmails(accessToken, [id]);
      onActionLogged('archive', 1);
      
      const filtered = newsletters.filter(n => n.id !== id);
      setNewsletters(filtered);
      
      if (selectedNewsletter?.id === id) {
        setSelectedNewsletter(filtered.length > 0 ? filtered[0] : null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to archive newsletter.');
    }
  };

  const handleWhitelist = (email: string) => {
    if (window.confirm(`Add ${email} to whitelist? It will skip future cleaning recommendations.`)) {
      addWhitelistedSender(email);
      const filtered = newsletters.filter(n => n.fromEmail !== email);
      setNewsletters(filtered);
      
      if (selectedNewsletter?.fromEmail === email) {
        setSelectedNewsletter(filtered.length > 0 ? filtered[0] : null);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Digest Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px', textAlign: 'left' }}>Daily Newsletter Digest</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Catch up on your reading in a distraction-free space. Mark items as read to archive them.
          </p>
        </div>
        <button 
          id="refresh-digest-btn"
          onClick={loadNewsletters} 
          disabled={isLoading || !accessToken} 
          className="btn-secondary"
          style={{ display: 'inline-flex', gap: '6px' }}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
          <span>Refresh</span>
        </button>
      </div>

      {newsletters.length === 0 && !isLoading ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BookOpen size={48} style={{ color: '#10b981', marginBottom: '16px', opacity: 0.8 }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Newsletters Found</h2>
          <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '14px' }}>
            We scanned your inbox and found no active subscriptions or newsletter format emails in the latest batch.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', minHeight: '500px' }}>
          
          {/* Left Feed List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
            {newsletters.map((n) => {
              const isSelected = selectedNewsletter?.id === n.id;
              return (
                <div
                  id={`digest-card-${n.id}`}
                  key={n.id}
                  onClick={() => setSelectedNewsletter(n)}
                  className="glass-panel"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-glass)',
                    borderLeft: isSelected ? '4px solid var(--color-newsletter)' : '1px solid var(--border-glass)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {n.fromName}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {n.date.split(',')[0] || n.date}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {n.subject}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {n.fromEmail}
                    </span>
                    <ChevronRight size={14} style={{ color: isSelected ? 'var(--color-newsletter)' : 'var(--text-muted)' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Reading / Summary Pane */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {selectedNewsletter ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* Email Header */}
                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '6px' }}>{selectedNewsletter.subject}</h2>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        From: <b>{selectedNewsletter.fromName}</b> &lt;{selectedNewsletter.fromEmail}&gt;
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        id={`digest-archive-btn`}
                        onClick={() => handleArchive(selectedNewsletter.id)}
                        className="btn-primary"
                        style={{ background: 'linear-gradient(135deg, var(--color-newsletter), var(--accent-blue))', padding: '8px 14px', fontSize: '12px' }}
                      >
                        <Archive size={14} /> Mark Read & Archive
                      </button>
                      <button
                        id={`digest-whitelist-btn`}
                        onClick={() => handleWhitelist(selectedNewsletter.fromEmail)}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        <Shield size={14} /> Keep in Inbox
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Summary Block */}
                <div style={{ marginBottom: '20px' }}>
                  {summaries[selectedNewsletter.id] ? (
                    <div className="animate-fade-in" style={{ 
                      padding: '16px', 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.2)', 
                      borderRadius: '10px',
                      marginBottom: '20px',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.05)'
                    }}>
                      <h3 style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <Sparkles size={14} /> Gemini Smart Summary
                      </h3>
                      <div 
                        style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}
                        dangerouslySetInnerHTML={{ __html: summaries[selectedNewsletter.id].replace(/\* (.*?)\n/g, '<li>$1</li>').replace(/\n/g, '<br/>') }}
                      />
                    </div>
                  ) : (
                    <button
                      id="generate-summary-btn"
                      onClick={() => handleSummarize(selectedNewsletter.id, selectedNewsletter.subject, selectedNewsletter.snippet)}
                      disabled={isSummarizing[selectedNewsletter.id]}
                      className="btn-secondary"
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center', 
                        border: '1px dashed var(--color-newsletter)', 
                        background: 'rgba(16, 185, 129, 0.02)',
                        color: '#6ee7b7',
                        padding: '14px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {isSummarizing[selectedNewsletter.id] ? (
                        <>
                          <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Distilling Newsletter Content...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Generate AI Smart Summary
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Newsletter Body Snippet */}
                <div style={{ 
                  flex: 1, 
                  background: 'rgba(0,0,0,0.15)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  fontSize: '14px', 
                  lineHeight: '1.7', 
                  color: 'var(--text-primary)',
                  overflowY: 'auto',
                  maxHeight: '300px'
                }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>Snippet Content</div>
                  {selectedNewsletter.snippet}
                  <div style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '12px', borderTop: '1px dashed var(--border-glass)', paddingTop: '10px' }}>
                    Note: To read the full layout with rich HTML images and links, please refer to your native Gmail client. Mailbox Janitor indexes snippet summaries to safeguard your reading speed.
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <Mail size={40} style={{ color: 'var(--text-muted)', marginBottom: '10px', opacity: 0.5 }} />
                <span>Select a newsletter from the feed to view its summary and details.</span>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
