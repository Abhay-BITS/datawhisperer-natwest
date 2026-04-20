'use client';
import { useState, useEffect } from 'react';
import { login } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [userId, setUserId] = useState('');   // stable UUID per user, never changes
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('dw_token');
    const storedSession = localStorage.getItem('dw_session');
    const storedUser = localStorage.getItem('dw_username');
    
    // Proactively ensure we have a stable user ID on mount
    const uid = _ensureUserId();
    setUserId(uid);

    if (token && storedSession) {
      setIsAuthenticated(true);
      setSessionId(storedSession);
      setUsername(storedUser || '');
    }
    setIsLoading(false);
  }, []);

  function _ensureUserId(): string {
    let uid = localStorage.getItem('dw_user_id');
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem('dw_user_id', uid);
    }
    return uid;
  }

  function createNewChat() {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem('dw_session', newId);

    const stored = localStorage.getItem('dw_sessions');
    const sessions = stored ? JSON.parse(stored) : [];
    if (!sessions.includes(newId)) {
      sessions.unshift(newId);
      localStorage.setItem('dw_sessions', JSON.stringify(sessions));
    }
    return newId;
  }

  function switchSession(id: string) {
    setSessionId(id);
    localStorage.setItem('dw_session', id);
  }

  async function signIn(user: string, password: string): Promise<boolean> {
    try {
      const data = await login(user, password);
      if (data.token) {
        localStorage.setItem('dw_token', data.token);
        localStorage.setItem('dw_username', data.username);

        // Assign a stable UUID to this user on first login — never changes
        const uid = _ensureUserId();
        setUserId(uid);

        setIsAuthenticated(true);
        setUsername(data.username);

        const lastSession = localStorage.getItem('dw_session');
        if (lastSession) {
          setSessionId(lastSession);
        } else {
          createNewChat();
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function signOut() {
    localStorage.removeItem('dw_token');
    // Keep dw_session, dw_username, dw_user_id so history stays visible
    setIsAuthenticated(false);
    setIsLoading(false);
    router.push('/auth');
  }

  return { isAuthenticated, username, userId, sessionId, isLoading, signIn, signOut, createNewChat, switchSession };
}
