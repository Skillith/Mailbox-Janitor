import React from 'react';
import { Sparkles, Trash2, Mail, FileText, Settings, LogIn, LogOut, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isConfigured: boolean;
  isAuthenticated: boolean;
  userEmail: string;
  onLogin: () => void;
  onLogout: () => void;
  isAutopilotActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isConfigured,
  isAuthenticated,
  userEmail,
  onLogin,
  onLogout,
  isAutopilotActive = false,
}) => {
  const tabs = [
    { id: 'sprints', name: 'Cleaning Sprints', icon: Trash2 },
    { id: 'digest', name: 'Newsletter Digest', icon: Mail },
    { id: 'rules', name: 'Rules & Auto-Filter', icon: FileText },
    { id: 'autopilot', name: 'Auto-Pilot', icon: Cpu },
    { id: 'analytics', name: 'Analytics', icon: Sparkles },
    { id: 'settings', name: 'API Configuration', icon: Settings },
  ];

  return (
    <nav className="glass-panel" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '14px 24px', 
      marginTop: '20px',
      marginBottom: '24px',
      borderRadius: '16px',
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setCurrentTab('sprints')}>
        <div style={{ 
          fontSize: '24px', 
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          padding: '4px 8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          🧹
        </div>
        <span style={{ 
          fontFamily: 'var(--font-heading)', 
          fontWeight: 700, 
          fontSize: '18px', 
          background: 'linear-gradient(to right, #ffffff, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.01em'
        }}>
          Mailbox Janitor
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const isAutopilotTab = tab.id === 'autopilot';
          
          return (
            <button
              id={`nav-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                border: 'none',
                background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                borderRadius: '8px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-heading)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              className={isActive ? '' : 'btn-hover-indicator'}
            >
              <Icon size={15} style={{ 
                color: isActive ? 'var(--accent-purple)' : 'inherit',
              }} />
              {tab.name}
              
              {isAutopilotTab && isAutopilotActive && (
                <span 
                  className="animate-pulse"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '6px',
                    height: '6px',
                    background: '#10b981',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #10b981',
                  }} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Auth & API Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isConfigured ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '12px', 
            color: 'var(--color-clutter)',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer',
          }} onClick={() => setCurrentTab('settings')}>
            <AlertTriangle size={14} />
            <span>Setup Required</span>
          </div>
        ) : !isAuthenticated ? (
          <button 
            id="google-login-btn"
            onClick={onLogin} 
            className="btn-primary" 
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <LogIn size={14} /> Sign In with Google
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={10} style={{ color: 'var(--color-newsletter)' }} /> Connected
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{userEmail || 'Gmail Active'}</span>
            </div>
            <button 
              id="google-logout-btn"
              onClick={onLogout} 
              className="btn-secondary" 
              style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
