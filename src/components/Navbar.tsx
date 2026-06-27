import React from 'react';
import { Settings, LogIn, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  isConfigured: boolean;
  isAuthenticated: boolean;
  userEmail: string;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConfigured,
  isAuthenticated,
  userEmail,
  onLogin,
  onLogout,
  onOpenSettings,
}) => {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          fontSize: '24px', 
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          padding: '4px 8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          🤖
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ 
            fontFamily: 'var(--font-heading)', 
            fontWeight: 700, 
            fontSize: '18px', 
            background: 'linear-gradient(to right, #ffffff, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.01em',
            lineHeight: '1.2'
          }}>
            Mailbox Janitor
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Auto-Pilot Agent
          </span>
        </div>
      </div>

      {/* Auth & API Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Settings Button (visible if configured, or can always be visible) */}
        <button
          onClick={onOpenSettings}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="API Configurations"
        >
          <Settings size={14} />
          <span>API Config</span>
        </button>

        {!isConfigured ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '12px', 
            color: 'var(--color-clutter)',
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer',
          }} onClick={onOpenSettings}>
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
