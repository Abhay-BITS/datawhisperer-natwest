'use client';
import { useState, useEffect } from 'react';
import { login } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('dw_token');
    const storedSession = localStorage.getItem('dw_session');
    const storedUser = localStorage.getItem('dw_username');
    if (token && storedSession) {
      setIsAuthenticated(true);
      setSessionId(storedSession);
      setUsername(storedUser || '');
    }
    setIsLoading(false);
  }, []);

  function createNewChat() {
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem('dw_session', newId);
    
    // Track sessions list
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
        setIsAuthenticated(true);
        setUsername(data.username);
        
        // Use existing session if any, otherwise create one
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
    // We keep dw_session and dw_username so history remains visible in the browser context
    setIsAuthenticated(false);
    setIsLoading(false);
    router.push('/auth');
  }

  return { isAuthenticated, username, sessionId, isLoading, signIn, signOut, createNewChat, switchSession };
}
