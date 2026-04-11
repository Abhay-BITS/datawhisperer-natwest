'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSources, deleteSource, cloneSources } from '@/lib/api';
import type { DataSource } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { AddSourceWizard } from '@/components/AddSourceWizard';

const DB_ICONS: Record<string, string> = {
  postgresql: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  mysql: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  sqlite: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg',
  csv: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/files.svg',
  excel: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftexcel.svg',
};

export default function SourcesPage() {
  const { isAuthenticated, sessionId, username, isLoading, signOut, createNewChat } = useAuth();
  const { nextStep } = useOnboarding();
  const router = useRouter();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loadingSources, setLoadingSources] = useState(true);

  // Dedicated stable session ID for the drafting area
  const DRAFT_SESSION_ID = `drafts_${username || 'anon'}`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (username) {
      getSources(DRAFT_SESSION_ID)
        .then(data => setSources(Array.isArray(data) ? data : data.sources || []))
        .catch(() => { })
        .finally(() => setLoadingSources(false));
    }
  }, [username, DRAFT_SESSION_ID]);

  const handleDelete = async (sourceId: string) => {
    await deleteSource(sourceId);
    setSources(prev => prev.filter(s => s.source_id !== sourceId));
  };

  const handleSourceAdded = (source: DataSource) => {
    setSources(prev => [...prev, source]);
    setShowWizard(false);
  };

  const handleStartChat = async (targetSourceId?: string) => {
    const fromId = DRAFT_SESSION_ID;
    const toId = createNewChat();
    
    if (sources.length > 0) {
      await cloneSources(fromId, toId);
    }
    
    if (targetSourceId) {
      // Find the cloned source ID for the target
      // This is a bit tricky, but for simplicity we can just navigate 
      // the backend will handle the query
      router.push(`/chat?source_id=${targetSourceId}`);
    } else {
      router.push('/chat');
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    return d.toLocaleTimeString();
  };

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            DataWhisperer
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <span className="mobile-hide" style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600 }}>Sources</span>
          <button
            onClick={() => router.push('/chat')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Chat
          </button>
          <button
            className="mobile-hide"
            onClick={() => router.push('/history')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            History
          </button>
          <span className="mobile-hide" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{username}</span>
          <button onClick={signOut} className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="mobile-full-width">
            <h1 className="mobile-branding-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Data Sources
            </h1>
            <p className="mobile-hide" style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.875rem' }}>
              Connect databases or upload files to start asking questions
            </p>
          </div>
          <button data-tour="source-add" className="btn-primary mobile-full-width" onClick={() => { setShowWizard(true); nextStep(); }}>
            + Add New Source
          </button>
        </div>

        {/* Clarification Bar */}
        {sources.length > 1 && (
          <div style={{
            background: 'rgba(255, 122, 0, 0.04)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 12,
            padding: '0.875rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ 
              width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
              flexShrink: 0
            }}>
              <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/info-circle.svg" alt="info" style={{ width: 16, height: 16 }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>Tip:</span> Use <strong>'Query'</strong> on any specific database for isolated analysis, or click <strong>'Start Asking Questions'</strong> to combine all sources into a unified chat.
            </p>
          </div>
        )}

        {/* Sources grid */}
        <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {sources.map(source => (
            <div key={source.source_id} className="card-hover" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: '1.25rem',
              position: 'relative',
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={DB_ICONS[source.db_type] || 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/database.svg'}
                      alt={source.db_type}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {source.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {source.db_type}
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: source.is_connected ? '#34d399' : '#fbbf24',
                  marginTop: 4,
                }} />
              </div>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {source.table_count} {source.table_count === 1 ? 'table' : 'tables'}&nbsp;·&nbsp;Connected {formatTime(source.connected_at)}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  data-tour="source-query"
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
                  onClick={() => handleStartChat(source.source_id)}
                >
                  Query
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', color: 'var(--error)', borderColor: 'var(--border-subtle)' }}
                  onClick={() => handleDelete(source.source_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add placeholder card */}
          <div
            className="card-hover"
            style={{
              background: 'transparent',
              border: '2px dashed var(--border-default)',
              borderRadius: 12,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 150,
              cursor: 'pointer',
              gap: 8,
            }}
            onClick={() => setShowWizard(true)}
          >
            <span style={{ fontSize: '1.5rem' }}>+</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Add Data Source</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
              Connect a database or upload a file
            </span>
          </div>
        </div>

        {/* CTA */}
        {sources.length > 0 && (
          <div style={{ textAlign: 'center', paddingTop: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              data-tour="source-combined"
              className="btn-primary mobile-full-width"
              style={{ fontSize: '1rem', padding: '0.75rem 2.5rem' }}
              onClick={() => handleStartChat()}
            >
              Start Asking Questions →
            </button>
          </div>
        )}

        {/* Info Section */}
        <div style={{ marginTop: sources.length === 0 ? '0' : '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Built for Modern Data Stacks
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Connect your infrastructure in seconds and start chatting with your data.
            </p>
          </div>

          {/* Supported DBs */}
          <div style={{ 
            display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap', 
            marginBottom: '2rem', opacity: 0.9
          }}>
            {Object.entries(DB_ICONS).map(([name, icon]) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <img src={icon} alt={name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{name}</span>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', maxWidth: 960, margin: '0 auto' }}>
            {[
              { 
                title: 'Semantic Search', 
                desc: 'Deep contextual understanding of your data schemas and relationships beyond just keyword matching.', 
                icon: 'zoom-question' 
              },
              { 
                title: 'Self-Correcting Queries', 
                desc: 'Our system automatically detects and fixes query errors in real-time for perfectly accurate results.', 
                icon: 'wand' 
              },
              { 
                title: 'Advanced Analysis Modes', 
                desc: 'Switch between Quick, Deep, and Compare modes to tailor the analysis depth to your specific needs.', 
                icon: 'adjustments-horizontal' 
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'transform 0.2s, border-color 0.2s',
              }}>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                }}>
                  <img src={`https://cdn.jsdelivr.net/npm/@tabler/icons/icons/${f.icon}.svg`} alt={f.icon} style={{ width: 18, height: 18 }} />
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Source Wizard Modal */}
      {showWizard && (
        <AddSourceWizard
          sessionId={DRAFT_SESSION_ID}
          onClose={() => setShowWizard(false)}
          onAdded={handleSourceAdded}
        />
      )}
    </div>
  );
}
