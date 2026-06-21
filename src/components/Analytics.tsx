import React, { useState, useEffect } from 'react';
import { getMetrics } from '../services/storage';
import type { CleanMetrics } from '../services/storage';
import { Sparkles, Trash2, Archive, Check, Clock, TrendingUp, RefreshCw, BarChart2 } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [metrics, setMetrics] = useState<CleanMetrics>({ archived: 0, deleted: 0, read: 0 });

  const loadMetrics = () => {
    setMetrics(getMetrics());
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const totalProcessed = metrics.archived + metrics.deleted + metrics.read;
  
  // Gamification: assume 8 seconds saved per email archived/deleted, 4 seconds per email marked read
  const secondsSaved = (metrics.archived + metrics.deleted) * 8 + metrics.read * 4;
  const minutesSaved = Math.round(secondsSaved / 60);

  const resetStats = () => {
    if (window.confirm('Are you sure you want to reset your usage statistics?')) {
      localStorage.removeItem('mbj_metric_archived');
      localStorage.removeItem('mbj_metric_deleted');
      localStorage.removeItem('mbj_metric_read');
      loadMetrics();
    }
  };

  // Percentages for visual breakdown
  const getPercentage = (value: number) => {
    if (totalProcessed === 0) return 0;
    return Math.round((value / totalProcessed) * 100);
  };

  const archivedPercent = getPercentage(metrics.archived);
  const deletedPercent = getPercentage(metrics.deleted);
  const readPercent = getPercentage(metrics.read);

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Inbox Analytics</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Visualizing your progress towards Inbox Zero.</p>
          </div>
        </div>

        {totalProcessed > 0 && (
          <button 
            id="reset-stats-btn"
            onClick={resetStats} 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} /> Reset Stats
          </button>
        )}
      </div>

      {totalProcessed === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <TrendingUp size={48} style={{ color: 'var(--accent-purple)', marginBottom: '16px', opacity: 0.6 }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>No Data Available</h3>
          <p style={{ maxWidth: '360px', margin: '0 auto', fontSize: '14px' }}>
            Run a few Cleaning Sprints and read newsletters. Your productivity statistics will show up here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            
            {/* Card 1: Total Cleaned */}
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.01)', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '8px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '50%', color: 'var(--accent-purple)', marginBottom: '12px' }}>
                <Sparkles size={20} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Processed</div>
              <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading)', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {totalProcessed}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>emails managed by Janitor</div>
            </div>

            {/* Card 2: Time Saved */}
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.01)', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--accent-blue)', marginBottom: '12px' }}>
                <Clock size={20} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Time Saved</div>
              <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading)', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {minutesSaved} <span style={{ fontSize: '16px', fontWeight: 500 }}>mins</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>of tedious sorting bypassed</div>
            </div>

            {/* Card 3: Health Score */}
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.01)', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981', marginBottom: '12px' }}>
                <TrendingUp size={20} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Inbox Health Score</div>
              <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading)', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>
                {Math.min(100, Math.round(((metrics.archived + metrics.read) / totalProcessed) * 100))}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>archived / read percentage</div>
            </div>

          </div>

          {/* Action Breakdown Bars */}
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.01)' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '16px' }}>Cleaning Activity Breakdown</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Archive */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Archive size={14} style={{ color: 'var(--accent-blue)' }} /> Archived (Inbox Cleaned)
                  </span>
                  <span style={{ fontWeight: 600 }}>{metrics.archived} ({archivedPercent}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${archivedPercent}%`, background: 'var(--accent-blue)', borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>

              {/* Delete */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Trash2 size={14} style={{ color: 'var(--color-clutter)' }} /> Trashed (Clutter Removed)
                  </span>
                  <span style={{ fontWeight: 600 }}>{metrics.deleted} ({deletedPercent}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${deletedPercent}%`, background: 'var(--color-clutter)', borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>

              {/* Read */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <Check size={14} style={{ color: 'var(--color-newsletter)' }} /> Kept & Marked Read (Newsletters Read)
                  </span>
                  <span style={{ fontWeight: 600 }}>{metrics.read} ({readPercent}%)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${readPercent}%`, background: 'var(--color-newsletter)', borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};
