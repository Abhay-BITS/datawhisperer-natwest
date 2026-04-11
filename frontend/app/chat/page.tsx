'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { getSources, suggestQuestions } from '@/lib/api';
import type { DataSource, Message } from '@/lib/types';
import { AddSourceWizard } from '@/components/AddSourceWizard';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const AMBER_COLORS = ['#42145f', '#7b2fa8', '#5c1f83', '#9d5cc9', '#c49de0', '#da1710'];

const MODES = [
  { value: 'quick', label: 'Quick' },
  { value: 'deep', label: 'Deep' },
  { value: 'compare', label: 'Compare' },
] as const;

const AGENT_COLORS: Record<string, string> = {
  'agent-semantic': '#7b2fa8',
  'agent-coder':    '#10b981',
  'agent-critic':   '#f59e0b',
  'agent-narrator': '#da1710',
};

const formatSQL = (sql: string) => {
  if (!sql) return '';
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING|LEFT JOIN|RIGHT JOIN|JOIN|SET|VALUES|UPDATE|INSERT INTO|DELETE FROM)\b/gi, '\n$1')
    .replace(/\b(AND|OR)\b/gi, '\n  $1')
    .replace(/,\s*/gi, ',\n  ')
    .trim();
};

const SUGGESTED_QUESTIONS_DEFAULT = [
  'Total revenue trends over the last 6 months',
  'What is the average loan amount by purpose?',
];

function ChatPageInner() {
  const { isAuthenticated, sessionId, username, isLoading, signOut, createNewChat } = useAuth();
  const router = useRouter();
  const {
    messages,
    isLoading: chatLoading,
    mode,
    setMode,
    sendMessage,
  } = useChat(sessionId || '');



  const [sources, setSources] = useState<DataSource[]>([]);
  const [input, setInput] = useState('');
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(SUGGESTED_QUESTIONS_DEFAULT);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'reasonings' | 'sources'>('chat');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const scopedSourceId = searchParams.get('source_id');
  const activeSources = scopedSourceId ? sources.filter(s => s.source_id === scopedSourceId) : sources;
  const scopedSource = sources.find(s => s.source_id === scopedSourceId);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth');
  }, [isAuthenticated, isLoading, router]);

  const fetchSources = async () => {
    if (!sessionId) return;
    try {
      const data = await getSources(sessionId);
      setSources(Array.isArray(data) ? data : data.sources || []);
    } catch (e) { }
  };

  useEffect(() => {
    fetchSources();
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && sources.length > 0) {
      setIsSuggestionsLoading(true);
      suggestQuestions(sessionId, scopedSourceId || undefined)
        .then(data => {
          if (data.questions && data.questions.length > 0) {
            setSuggestedQuestions(data.questions);
          }
        })
        .catch(() => { })
        .finally(() => setIsSuggestionsLoading(false));
    }
  }, [sessionId, sources.length, scopedSourceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const msg = input;
    setInput('');
    setActiveMessageId(null);
    await sendMessage(msg, activeSources.map(s => s.source_id));
  };

  const handleFollowup = async (q: string) => {
    if (chatLoading) return;
    setActiveMessageId(null);
    await sendMessage(q, activeSources.map(s => s.source_id));
  };

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem', height: 52, flexShrink: 0,
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>
            DataWhisperer
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <button
            onClick={() => createNewChat()}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '4px 12px', fontSize: '0.75rem',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}
          >
            <span style={{ fontSize: '1rem' }}>+</span> New Chat
          </button>
          <button
            className="mobile-hide"
            onClick={() => router.push('/sources')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            Sources{sources.length > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff', borderRadius: 9999,
                padding: '1px 6px', fontSize: '0.7rem', marginLeft: 4,
              }}>
                {sources.length}
              </span>
            )}
          </button>
          <span className="mobile-hide" style={{ color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600 }}>Chat</span>
          <button
            className="mobile-hide"
            onClick={() => router.push('/history')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem' }}
          >
            History
          </button>
          <span className="mobile-hide" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{username}</span>
          <button onClick={signOut} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
            ↗
          </button>
        </div>
      </nav>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Chat column */}
        <div
          className="chat-main-column"
          style={{
            flex: 1,
            display: activeTab === 'chat' ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {messages.length === 0 && (
              <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '2rem' }}>
                  <div style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.8 }}>
                    <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/sparkles.svg" alt="sparkle" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>
                    Ask anything about {scopedSource ? (
                      <span style={{ color: 'var(--accent)' }}>
                        {scopedSource.name} {scopedSource.table_count !== undefined && scopedSource.table_count > 0 && `(${scopedSource.table_count} tables)`}
                      </span>
                    ) : 'your data'}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                    {scopedSource ? `Scoped query mode active for ${scopedSource.db_type.toUpperCase()}` : 'Connect a data source and start with a question'}
                  </p>
                </div>

                {/* Database indicator in landing state */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '1rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 12,
                  marginBottom: '2rem'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Context:</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {activeSources.map(s => (
                      <div key={s.source_id} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                        padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem'
                      }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>[{s.db_type.toUpperCase()}]</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {s.name} {s.table_count !== undefined && s.table_count > 0 && `(${s.table_count} ${s.table_count === 1 ? 'table' : 'tables'})`}
                        </span>
                      </div>
                    ))}
                    {activeSources.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No sources selected</span>}
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Suggested questions:
                  {isSuggestionsLoading && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Generating new ideas...</span>
                  )}
                </p>
                {!isSuggestionsLoading && suggestedQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                      borderRadius: 9999, padding: '0.625rem 1.25rem',
                      color: 'var(--text-secondary)', marginBottom: 8, cursor: 'pointer',
                      fontSize: '0.875rem', fontFamily: 'var(--font-body)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map(msg => {
              const userMsgCount = messages.filter(m => m.type === 'user').length;
              const showHint = userMsgCount >= 2 && msg.type !== 'user' && msg.id !== activeMessageId;

              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  expandedTrace={expandedTrace}
                  setExpandedTrace={setExpandedTrace}
                  onFollowup={handleFollowup}
                  isActive={msg.id === activeMessageId}
                  onClick={() => setActiveMessageId(msg.id)}
                  showReasoningHint={showHint}
                  onCopyStatus={setCopyStatus}
                />
              );
            })}

            {chatLoading && (
              <div className="animate-fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  padding: 6
                }}>
                  <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/sparkles.svg" alt="sparkle" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  borderRadius: 12, padding: '1rem',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%',
                      animation: `pulse-dot 1s ease-in-out ${delay}s infinite`,
                    }} />
                  ))}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginLeft: 4 }}>
                    Analyzing...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Modes (Gemini Style Pill) */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ maxWidth: 850, margin: '0 auto', width: '100%' }}>
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 24,
                border: '1px solid var(--border-default)',
                padding: '0.75rem 1rem',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask anything about your data..."
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    resize: 'none',
                    outline: 'none',
                    minHeight: 44,
                    maxHeight: 200,
                    padding: 0
                  }}
                  rows={1}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Database Select */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>DATA:</span>
                      <select
                        value={scopedSourceId || 'all'}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'all') router.push('/chat');
                          else router.push(`/chat?source_id=${val}`);
                        }}
                        style={{
                          background: 'var(--bg-main)', border: '1px solid var(--border-default)',
                          borderRadius: 12, padding: '2px 8px', fontSize: '0.7rem',
                          color: 'var(--accent)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                          fontWeight: 600
                        }}
                      >
                        {sources.length > 1 && <option value="all">Combined ({sources.length})</option>}
                        {sources.map(s => (
                          <option key={s.source_id} value={s.source_id}>
                            [{s.db_type.toUpperCase()}] {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Connect Button */}
                    <button
                      data-tour="chat-connect"
                      onClick={() => setShowWizard(true)}
                      style={{
                        background: 'none',
                        border: '1px dashed var(--border-default)',
                        borderRadius: 12,
                        padding: '3px 10px',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>+</span>
                      Connect Database
                    </button>

                    <div style={{ width: 1, height: 16, background: 'var(--border-default)' }} />

                    {/* Mode Select */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MODE:</span>
                      <select
                        data-tour="chat-mode"
                        value={mode}
                        onChange={e => setMode(e.target.value as any)}
                        style={{
                          background: 'var(--bg-main)', border: '1px solid var(--border-default)',
                          borderRadius: 12, padding: '2px 8px', fontSize: '0.7rem',
                          color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                          fontWeight: 500
                        }}
                      >
                        {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || chatLoading}
                    style={{
                      background: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      opacity: (!input.trim() || chatLoading) ? 0.5 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/arrow-up.svg" alt="send" style={{ width: 18, height: 18, filter: 'brightness(0) invert(1)' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Tabs */}
          <div className="desktop-hide" style={{
            display: 'flex', borderTop: '1px solid var(--border-subtle)',
            paddingTop: '0.5rem', gap: 4, justifyContent: 'space-around'
          }}>
            {[
              { id: 'chat', label: 'Chat', icon: 'sparkles' },
              { id: 'reasonings', label: 'Reasonings', icon: 'brain' },
              { id: 'sources', label: 'Sources', icon: 'database' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  flex: 1, background: 'none', border: 'none', padding: '6px',
                  color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '0.65rem', fontWeight: 600, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 2, cursor: 'pointer'
                }}
              >
                <img src={`https://cdn.jsdelivr.net/npm/@tabler/icons/icons/${t.icon}.svg`} alt={t.id} style={{ width: 18, height: 18, filter: activeTab === t.id ? 'none' : 'grayscale(1)' }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Toast for Copy Status */}
        {copyStatus && (
          <div style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent)', color: 'white', padding: '8px 16px',
            borderRadius: 24, fontSize: '0.75rem', fontWeight: 600, zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', animation: 'fade-in 0.2s'
          }}>
            {copyStatus}
          </div>
        )}

        {/* Right side layout (Reasoning + Sources) */}
        {(messages.length > 0 || activeTab !== 'chat') && (
          <div
            className="chat-right-sidebar"
            style={{
              width: 380, flexShrink: 0,
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            {/* Mobile Tab Control for the right panel */}
            <div className="desktop-hide" style={{ padding: '0.5rem 1rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setActiveTab('chat')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600 }}>← Back to Chat</button>
              <div style={{ flex: 1 }} />
              <button onClick={() => setActiveTab('reasonings')} style={{ background: (activeTab === 'reasonings' || activeTab === 'chat') ? 'var(--accent-dim)' : 'none', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: (activeTab === 'reasonings' || activeTab === 'chat') ? 'var(--accent)' : 'var(--text-muted)' }}>Reasoning</button>
              <button onClick={() => setActiveTab('sources')} style={{ background: activeTab === 'sources' ? 'var(--accent-dim)' : 'none', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: '0.75rem', color: activeTab === 'sources' ? 'var(--accent)' : 'var(--text-muted)' }}>Sources</button>
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'var(--bg-surface)'
            }}>
              {/* Reasoning Section (Scrollable Area) */}
              <div
                className="reasoning-scroller"
                style={{
                  flex: 1,
                  display: (activeTab === 'reasonings' || activeTab === 'chat') ? 'flex' : 'none',
                  flexDirection: 'column',
                  overflowY: 'auto'
                }}
              >
                <div style={{
                  background: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}>
                  <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/brain.svg" alt="brain" style={{ width: 16, height: 16, opacity: 0.7 }} />
                  Reasoning Trail
                </div>

                <div style={{ flex: 1, padding: '1.5rem', paddingBottom: '3rem' }}>
                  {(() => {
                    const activeMsg = messages.find(m => m.id === activeMessageId) || [...messages].reverse().find(m => m.type !== 'user');
                    if (!activeMsg || !activeMsg.response || !activeMsg.response.trust_trace) {
                      if (chatLoading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Agent is thinking...</div>;
                      return <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No reasoning trace available.</div>;
                    }
                    return (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeMsg.response.trust_trace.map((entry, i) => (
                          <ThoughtCard key={i} entry={entry} index={i} />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sources Section (Fixed or Bottom) */}
              <div
                className="sources-section"
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '2px solid var(--border-default)',
                  background: 'var(--bg-surface)',
                  flexShrink: 0,
                  display: activeTab === 'sources' ? 'block' : 'none'
                }}
              >
                <p style={{
                  color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem 0',
                }}>
                  Connected Sources
                </p>
                {activeSources.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No active sources</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeSources.map(s => (
                      <div key={s.source_id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/folder.svg" alt="folder" style={{ width: 14, height: 14 }} />
                          <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 700 }}>[{s.db_type.toUpperCase()}]</span>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Source Wizard */}
      {showWizard && (
        <AddSourceWizard
          sessionId={sessionId}
          onClose={() => setShowWizard(false)}
          onAdded={() => {
            setShowWizard(false);
            fetchSources();
          }}
        />
      )}
    </div>
  );
}

function MessageBubble({ msg, expandedTrace, setExpandedTrace, onFollowup, isActive, onClick, showReasoningHint, onCopyStatus }: {
  msg: Message;
  expandedTrace: string | null;
  setExpandedTrace: (id: string | null) => void;
  onFollowup: (q: string) => void;
  isActive: boolean;
  onClick: () => void;
  showReasoningHint?: boolean;
  onCopyStatus: (s: string | null) => void;
}) {
  const isUser = msg.type === 'user';
  const r = msg.response;

  if (isUser) {
    return (
      <div
        className="animate-fade-in"
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', cursor: 'pointer' }}
        onClick={onClick}
      >
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--border-default)',
          borderRadius: '12px 12px 2px 12px',
          padding: '0.625rem 1rem', maxWidth: '70%',
          fontSize: '0.9375rem', color: 'var(--text-primary)',
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === 'error' || !r) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(248,113,113,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          padding: 7,
        }}>
          <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/alert-triangle.svg" alt="warning" style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 12, padding: '0.875rem 1rem',
          color: 'var(--error)', fontSize: '0.875rem',
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  const traceId = msg.id;
  const isTraceExpanded = expandedTrace === traceId;

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', alignItems: 'flex-start', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div
        data-tour="chat-insight"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, padding: 6,
        }}>
        <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/sparkles.svg" alt="sparkle" style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{
        flex: 1, background: 'var(--bg-surface)',
        border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border-default)'}`,
        borderRadius: 12, overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
        {showReasoningHint && (
          <div style={{
            padding: '0.25rem 1rem',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.55rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontWeight: 500,
            textAlign: 'right',
            opacity: 0.7
          }}>
            Click here to see the Reasoning
          </div>
        )}
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              background: r.mode === 'quick'
                ? 'rgba(251,191,36,0.15)'
                : r.mode === 'compare'
                  ? 'rgba(96,165,250,0.15)'
                  : 'var(--accent-dim)',
              color: r.mode === 'quick'
                ? '#f59e0b'
                : r.mode === 'compare'
                  ? '#3b82f6'
                  : 'var(--accent)',
              border: `1px solid ${r.mode === 'quick' ? '#f59e0b' : r.mode === 'compare' ? '#3b82f6' : 'var(--accent)'}`,
              borderRadius: 9999, padding: '0.1875rem 0.625rem',
              fontSize: '0.6875rem', fontWeight: 600,
            }}>
              {r.mode === 'quick' ? 'Quick' : r.mode === 'compare' ? 'Compare' : 'Deep'}
            </span>
          </div>
          {r.confidence_score != null && (
            <span style={{
              color: r.confidence_score >= 80
                ? 'var(--success)'
                : r.confidence_score >= 60
                  ? 'var(--warning)'
                  : 'var(--error)',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}>
              {r.confidence_score}% confidence
            </span>
          )}
        </div>

        <div style={{ padding: '1rem' }}>
          {/* Insight narrative */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              <div style={{
                fontSize: '0.6875rem', color: 'var(--text-muted)',
                fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                INSIGHT
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(r.insight_narrative);
                  alert('Insight copied to clipboard!');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Copy
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {r.insight_narrative}
            </p>
          </div>

          {/* Verification badge — only show a subtle tick, full note is in Thoughts panel */}
          {r.is_verified && (
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginBottom: '0.75rem', opacity: 0.7 }}>
              ✓ Verified
            </div>
          )}

          {/* Chart */}
          {r.execution_result &&
            r.visualization?.chart_type &&
            r.visualization.chart_type !== 'none' &&
            r.visualization.chart_type !== 'table' && (
              <ChartContainer 
                result={r.execution_result} 
                viz={r.visualization} 
                onCopyStatus={onCopyStatus}
              />
            )}

          {/* Data table */}
          {r.execution_result?.rows && r.execution_result.rows.length > 0 && (
            <DataTable result={r.execution_result} />
          )}



          {/* Follow-up suggestions */}
          {r.suggested_followups && r.suggested_followups.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {r.suggested_followups.map(q => (
                <button
                  key={q}
                  onClick={() => onFollowup(q)}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    borderRadius: 9999, padding: '0.3rem 0.875rem',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '0.8125rem', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartContainer({ result, viz, onCopyStatus }: { result: any; viz: any; onCopyStatus: (s: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExport = async (mode: 'copy' | 'download') => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    try {
      // Create a canvas to draw the SVG into
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set dimensions
      const bbox = svg.getBoundingClientRect();
      canvas.width = bbox.width * 2; // High DPI
      canvas.height = bbox.height * 2;
      ctx.scale(2, 2);

      // Add background
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim() || '#ffffff';
      ctx.fillRect(0, 0, bbox.width, bbox.height);

      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
        URL.revokeObjectURL(url);

        if (mode === 'download') {
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `${viz.title.replace(/\s+/g, '_')}.png`;
          link.href = pngUrl;
          link.click();
        } else {
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                const data = [new ClipboardItem({ [blob.type]: blob })];
                await navigator.clipboard.write(data);
                onCopyStatus('Chart copied!');
                setTimeout(() => onCopyStatus(null), 2000);
              } catch (err) {
                console.error('Clipboard error:', err);
              }
            }
          });
        }
      };
      img.src = url;
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div style={{ marginBottom: '1rem', background: 'var(--bg-elevated)', borderRadius: 8, padding: '1rem', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {viz.title}
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => handleExport('copy')}
            title="Copy to Clipboard"
            style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, 
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600
            }}
          >
            <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/copy.svg" alt="copy" style={{ width: 14, height: 14 }} />
            Copy
          </button>
          <button
            onClick={() => handleExport('download')}
            title="Download as PNG"
            style={{ 
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 4, 
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600
            }}
          >
            <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/download.svg" alt="download" style={{ width: 14, height: 14 }} />
            Export
          </button>
        </div>
      </div>
      <div ref={containerRef}>
        <ChartRenderer result={result} viz={viz} />
      </div>
    </div>
  );
}

function ChartRenderer({ result, viz }: { result: any; viz: any }) {
  const data = result.rows.slice(0, 50).map((row: any[]) => {
    const obj: Record<string, any> = {};
    result.columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj;
  });

  // Case-insensitive column matching logic
  const findColumn = (key: string) => {
    if (!key) return key;
    return result.columns.find((c: string) => c.toLowerCase() === key.toLowerCase()) || key;
  };

  const xAxis = findColumn(viz.x_axis);
  const yAxis = findColumn(viz.y_axis);

  const tooltipStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border-default)',
    borderRadius: 6,
    color: 'var(--text-primary)',
  };

  const commonProps = {
    data,
    margin: { top: 10, right: 10, left: 0, bottom: 5 },
  };

  if (viz.chart_type === 'bar') return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey={xAxis} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey={yAxis} fill="#42145f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (viz.chart_type === 'line') return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey={xAxis} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          dataKey={yAxis}
          stroke="#42145f"
          strokeWidth={2}
          dot={{ r: 3, fill: '#42145f' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  if (viz.chart_type === 'pie') return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey={yAxis}
          nameKey={xAxis}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_: any, i: number) => (
            <Cell key={i} fill={AMBER_COLORS[i % AMBER_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );

  if (viz.chart_type === 'scatter') return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey={xAxis} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis dataKey={yAxis} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Scatter data={data} fill="#42145f" />
      </ScatterChart>
    </ResponsiveContainer>
  );

  return null;
}

// Max columns to show before clipping — keeps the table readable
const MAX_COLS = 8;

function DataTable({ result }: { result: any }) {
  const allCols: string[] = result.columns;
  const rows: any[][] = result.rows;

  // If more than MAX_COLS, show first MAX_COLS and a "+N more" indicator
  const visibleCols = allCols.length > MAX_COLS ? allCols.slice(0, MAX_COLS) : allCols;
  const hiddenCount = allCols.length - visibleCols.length;
  const visibleIndexes = visibleCols.map((_: string, i: number) => i);

  return (
    <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
            {visibleCols.map((col: string) => (
              <th key={col} style={{
                padding: '0.375rem 0.625rem', textAlign: 'left',
                color: 'var(--text-muted)', fontWeight: 600,
                fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}>
                {col}
              </th>
            ))}
            {hiddenCount > 0 && (
              <th style={{ padding: '0.375rem 0.625rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                +{hiddenCount} more
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row: any[], i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {visibleIndexes.map((j: number) => {
                const cell = row[j];
                const isNum = typeof cell === 'number';
                return (
                  <td key={j} style={{
                    padding: '0.375rem 0.625rem',
                    color: 'var(--text-secondary)',
                    fontFamily: isNum ? 'var(--font-mono)' : 'var(--font-body)',
                    whiteSpace: 'nowrap',
                  }}>
                    {cell == null
                      ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                      : isNum
                        ? Number(cell).toLocaleString()
                        : String(cell)}
                  </td>
                );
              })}
              {hiddenCount > 0 && <td />}
            </tr>
          ))}
        </tbody>
      </table>
      {(result.truncated || rows.length < result.row_count) && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
          Showing {rows.slice(0, 10).length} of {result.row_count.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}

// ─── Agent colour map ────────────────────────────────────────────────────────
const AGENT_ACCENT: Record<string, string> = {
  'Semantic Agent': 'var(--agent-semantic)',
  'Coder Agent': 'var(--agent-coder)',
  'Critic Agent': 'var(--agent-critic)',
  'Narrator Agent': 'var(--agent-narrator)',
  'Confidence Scorer': 'var(--agent-critic)',
  'Assumptions Auditor': 'var(--agent-critic)',
};

const AGENT_ICON: Record<string, string> = {
  'Semantic Agent': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/puzzle.svg',
  'Coder Agent': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/code.svg',
  'Critic Agent': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/search.svg',
  'Narrator Agent': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/edit.svg',
  'Confidence Scorer': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/chart-bar.svg',
  'Assumptions Auditor': 'https://cdn.jsdelivr.net/npm/@tabler/icons/icons/scale.svg',
};

const RISK_COLOR: Record<string, string> = {
  SAFE: 'var(--success)',
  RISKY: 'var(--error)',
  UNKNOWN: 'var(--warning)',
};

function ThoughtCard({ entry, index }: { entry: any; index: number }) {
  const accent = AGENT_ACCENT[entry.agent] || 'var(--text-muted)';
  const icon = AGENT_ICON[entry.agent] || '•';
  const d = entry.details || {};

  return (
    <div style={{
      borderLeft: `2px solid ${accent}`,
      paddingLeft: '0.875rem',
      paddingBottom: '0.25rem',
    }}>
      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={icon} alt={entry.agent} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ color: accent, fontSize: '0.8125rem', fontWeight: 700 }}>{entry.agent}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>· {entry.action}</span>
      </div>

      {/* ── Semantic Agent ── */}
      {entry.agent === 'Semantic Agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Intent */}
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.5rem 0.75rem',
            fontSize: '0.8125rem', color: 'var(--text-primary)', fontStyle: 'italic',
          }}>
            "{d.intent || entry.output}"
          </div>

          {/* Source + rationale */}
          {d.sources && d.sources.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SOURCE  </span>
              {d.sources.join(', ')}
              {d.source_rationale && (
                <span style={{ color: 'var(--text-muted)' }}> — {d.source_rationale}</span>
              )}
            </div>
          )}

          {/* Metric mappings */}
          {d.metric_mappings && Object.keys(d.metric_mappings).length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Metric Mappings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.entries(d.metric_mappings).map(([term, expr]: [string, any]) => (
                  <div key={term} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: accent, fontFamily: 'var(--font-mono)' }}>{term}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ color: 'var(--agent-coder)', fontFamily: 'var(--font-mono)' }}>{String(expr)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          {d.assumptions && d.assumptions.length > 0 && (
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Assumptions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {d.assumptions.map((a: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.75rem' }}>
                    <span style={{
                      color: RISK_COLOR[a.risk] || 'var(--text-muted)',
                      fontWeight: 700, flexShrink: 0, fontSize: '0.6875rem',
                      background: `${RISK_COLOR[a.risk]}18`,
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      {a.risk}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{a.statement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Coder Agent ── */}
      {entry.agent === 'Coder Agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Retry warning */}
          {d.is_retry && d.retry_error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 6, padding: '0.375rem 0.625rem',
              fontSize: '0.75rem', color: 'var(--error)',
            }}>
              ↻ Retry — previous error: {d.retry_error}
            </div>
          )}

          {/* Dialect + mode badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            {d.dialect && (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 4, padding: '2px 6px' }}>
                {d.dialect}
              </span>
            )}
            {d.mode && (
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 4, padding: '2px 6px' }}>
                {d.mode} mode
              </span>
            )}
          </div>

          {/* SQL block */}
          <div style={{ position: 'relative' }}>
            <div className="code-block" style={{
              fontSize: '0.75rem', background: 'var(--bg-surface)',
              maxHeight: 240, overflow: 'auto',
              whiteSpace: 'pre', lineHeight: '1.5',
            }}>
              {formatSQL(entry.output)}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(entry.output); }}
              style={{
                position: 'absolute', top: 4, right: 4,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 4, padding: '2px 7px', fontSize: '0.6rem',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Copy
            </button>
          </div>

          {/* Explanation */}
          {d.explanation && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {d.explanation}
            </div>
          )}
        </div>
      )}

      {/* ── Critic Agent ── */}
      {entry.agent === 'Critic Agent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Checklist */}
          {d.checks && d.checks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.checks.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.8125rem' }}>
                  <span style={{ color: c.pass ? 'var(--success)' : 'var(--error)', flexShrink: 0, fontWeight: 700 }}>
                    {c.pass ? '✓' : '✗'}
                  </span>
                  <span style={{ color: c.pass ? 'var(--text-secondary)' : 'var(--error)' }}>
                    {c.label}
                    {c.note && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> — {c.note}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Stats row */}
          {d.row_count !== undefined && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {d.row_count.toLocaleString()} row{d.row_count !== 1 ? 's' : ''} · {(d.columns || []).length} column{(d.columns || []).length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* ── Narrator / Confidence / fallback ── */}
      {!['Semantic Agent', 'Coder Agent', 'Critic Agent'].includes(entry.agent) && (
        <div style={{
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {entry.output}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
