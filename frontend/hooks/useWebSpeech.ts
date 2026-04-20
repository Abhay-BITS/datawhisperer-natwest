'use client';
import { useRef, useCallback } from 'react';

export function useSpeechRecognition(
  onResult: (text: string, confidence: number) => void,
  onFallback: () => void,
) {
  const recRef = useRef<any>(null);
  const isSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const start = useCallback((lang = 'en-IN') => {
    if (!isSupported) { onFallback(); return; }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      const confidence = e.results[0][0].confidence ?? 0.75;
      onResult(transcript, confidence);
    };
    rec.onerror = () => onFallback();
    rec.start();
    recRef.current = rec;
  }, [isSupported, onResult, onFallback]);

  const stop = useCallback(() => { recRef.current?.stop(); }, []);

  return { start, stop, isSupported };
}

export function speakText(text: string, lang = 'en-IN', rate = 0.92): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.name.includes('Google'))
      || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
