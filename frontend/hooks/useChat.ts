import { useState, useCallback, useEffect } from 'react';
import { sendChat } from '@/lib/api';
import type { Message, ChatResponse } from '@/lib/types';

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'quick' | 'deep' | 'compare'>('deep');

  // Load messages from localStorage on mount or when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const key = `dw_messages_${sessionId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (err) {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;
    const key = `dw_messages_${sessionId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  }, [messages, sessionId]);

  const sendMessage = useCallback(async (content: string, sourceIds?: string[]) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    // Add user message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Prepare history context for the backend (last 5 messages)
      const context = updatedMessages
        .slice(-6, -1) // Exclude current msg, take prev 5
        .map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      const response: ChatResponse = await sendChat(content, sessionId, mode, sourceIds, context);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        type: response.error ? 'error' : 'assistant',
        content: response.insight_narrative || response.error || 'Analysis complete.',
        timestamp: new Date().toISOString(),
        response,
        mode: mode,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        type: 'error',
        content: 'Failed to connect to the analysis engine. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, mode, messages]);

  return { messages, isLoading, mode, setMode, sendMessage };
}
