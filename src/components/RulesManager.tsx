import React, { useState, useEffect } from 'react';
import { 
  getAutoCleanRules, 
  removeAutoCleanRule, 
  getWhitelistedSenders, 
  removeWhitelistedSender, 
} from '../services/storage';
import type { AutoCleanRule } from '../services/storage';
import { FileText, ShieldAlert, Trash2, Shield, AlertCircle } from 'lucide-react';

export const RulesManager: React.FC = () => {
  const [rules, setRules] = useState<AutoCleanRule[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'rules' | 'whitelist'>('rules');

  const loadData = () => {
    setRules(getAutoCleanRules());
    setWhitelist(getWhitelistedSenders());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteRule = (email: string) => {
    if (window.confirm(`Delete auto-cleanup rule for ${email}?`)) {
      removeAutoCleanRule(email);
      loadData();
    }
  };

  const handleDeleteWhitelist = (email: string) => {
    if (window.confirm(`Remove ${email} from your whitelist?`)) {
      removeWhitelistedSender(email);
      loadData();
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
        <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
          <FileText size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Cleanup Rules & Filters</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Manage automatic cleanup preferences and whitelisted senders.</p>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          id="subtab-rules-btn"
          onClick={() => setActiveSubTab('rules')}
          style={{
            padding: '8px 16px',
            background: activeSubTab === 'rules' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            color: activeSubTab === 'rules' ? '#93c5fd' : 'var(--text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeSubTab === 'rules' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-glass)',
          }}
        >
          Auto-Cleanup Rules ({rules.length})
        </button>
        <button
          id="subtab-whitelist-btn"
          onClick={() => setActiveSubTab('whitelist')}
          style={{
            padding: '8px 16px',
            background: activeSubTab === 'whitelist' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            color: activeSubTab === 'whitelist' ? '#6ee7b7' : 'var(--text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeSubTab === 'whitelist' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)',
          }}
        >
          Whitelisted Senders ({whitelist.length})
        </button>
      </div>

      {activeSubTab === 'rules' ? (
        <div>
          {rules.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ fontSize: '14px' }}>No active automatic clean-up rules.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                You can generate rules inside the Cleaning Sprint view when details are expanded.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {rules.map((rule) => (
                <div 
                  id={`rule-card-${rule.email}`}
                  key={rule.email} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    borderLeft: `3px solid ${rule.action === 'delete' ? 'var(--color-clutter)' : 'var(--color-personal)'}`,
                    background: 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className={`badge badge-${rule.action === 'delete' ? 'clutter' : 'personal'}`} style={{ fontSize: '10px' }}>
                        Auto-{rule.action}
                      </span>
                      <button 
                        onClick={() => handleDeleteRule(rule.email)}
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete rule"
                      >
                        <Trash2 size={14} className="hover-red-svg" />
                      </button>
                    </div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {rule.senderName || 'Unknown Senders'}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      {rule.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {whitelist.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              <ShieldAlert size={32} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ fontSize: '14px' }}>No whitelisted senders.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                Whitelisting a sender ensures their emails will never be suggested for cleanup sprints.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {whitelist.map((email) => (
                <div 
                  id={`whitelist-tag-${email}`}
                  key={email} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 12px', 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px', 
                    fontSize: '13px',
                    color: '#6ee7b7'
                  }}
                >
                  <Shield size={12} />
                  <span>{email}</span>
                  <button 
                    onClick={() => handleDeleteWhitelist(email)}
                    style={{ border: 'none', background: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
