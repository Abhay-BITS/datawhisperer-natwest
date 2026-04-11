'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function AuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { nextStep, currentStep } = useOnboarding();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) { setError('Please enter credentials'); return; }
    setLoading(true);
    setError('');
    const ok = await signIn(username, password);
    setLoading(false);
    if (ok) {
      if (currentStep === 0) nextStep();
      router.push('/sources');
    } else {
      setError('Sign in failed. Please try again.');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-void)',
      position: 'relative',
      overflow: 'hidden',
    }}>


      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div className="pulse-dot" />
            <span className="mobile-branding-text" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.875rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              DataWhisperer
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            "Ask anything. Trust everything."
          </p>
        </div>

        {/* Card */}
        <div 
          data-tour="auth-card"
          style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 6, fontWeight: 500 }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="any username"
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '0.625rem 0.875rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 6, fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="any password"
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '0.625rem 0.875rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem' }}>
            Demo: use any username & password
          </p>
        </div>
      </div>
    </div>
  );
}
