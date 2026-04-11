'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getChatHistory, exportHistoryCsv } from '@/lib/api';

export default function HistoryPage() {
  const { isAuthenticated, username, isLoading, signOut, switchSession } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setLoadingHistory(true);
    // Load all session IDs from dw_sessions
    const storedSessions = localStorage.getItem('dw_sessions');
    const sessionIds: string[] = storedSessions ? JSON.parse(storedSessions) : [];
    
    const threadData = sessionIds.map(id => {
      const msgKey = `dw_messages_${id}`;
      const msgs = localStorage.getItem(msgKey);
      if (msgs) {
        try {
          const parsed = JSON.parse(msgs);
          const firstUserMsg = parsed.find((m: any) => m.type === 'user');
          return {
            id,
            title: firstUserMsg ? firstUserMsg.content : 'Untitled Conversation',
            timestamp: firstUserMsg ? firstUserMsg.timestamp : new Date().toISOString(),
            messageCount: parsed.length
          };
        } catch (e) { return null; }
      }
      return null;
    }).filter(Boolean);

    // Sort by newest first
    threadData.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setThreads(threadData);
    setLoadingHistory(false);
  }, []);

  const formatRelTime = (iso: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleThreadClick = (id: string) => {
    switchSession(id);
    router.push('/chat');
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
        background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9375rem' }}>
            DataWhisperer
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button
            className="mobile-hide"
            onClick={() => router.push('/sources')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Sources
          </button>
          <button
            onClick={() => router.push('/chat')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Chat
          </button>
          <span className="mobile-hide" style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600 }}>History</span>
          <span className="mobile-hide" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{username}</span>
          <button onClick={signOut} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
            ↗
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            Your Conversations
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.9375rem' }}>
            Persistent history stored in your browser.
          </p>
        </div>

        {loadingHistory ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '3rem' }}>
            Loading threads...
          </p>
        ) : threads.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 1.5rem', opacity: 0.5 }}>
              <img src="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/messages.svg" alt="messages" style={{ width: '100%', height: '100%' }} />
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1rem' }}>
              No chat history found in this browser.
            </p>
            <button className="btn-primary" onClick={() => router.push('/chat')}>
              Start New Conversation
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="card-hover"
                style={{
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  borderRadius: 16, padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', gap: 10,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onClick={() => handleThreadClick(thread.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ 
                    color: 'var(--text-muted)', fontSize: '0.7rem', 
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' 
                  }}>
                    {formatRelTime(thread.timestamp)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    {thread.messageCount} messages
                  </span>
                </div>
                <h3 style={{ 
                  margin: 0, fontSize: '1.0625rem', color: 'var(--text-primary)', 
                  fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' 
                }}>
                  {thread.title}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
