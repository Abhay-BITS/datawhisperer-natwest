/**
 * Browser-only voice pipeline (Google Web Speech API + speechSynthesis).
 * No backend STT/TTS dependency.
 */
import { useState, useRef, useCallback } from 'react';
import { useSpeechRecognition, speakText } from './useWebSpeech';

export type VoiceState =
  | 'idle' | 'recording' | 'transcribing' | 'confirming'
  | 'validating' | 'thinking' | 'speaking' | 'error';

interface UseVoiceOptions {
  sessionId: string;
  sourceIds: string[];
  analysisMode: string;
  onChatResponse: (response: any, transcript?: string) => void;
}

function withTimeout(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function detectLanguage(text: string): 'hi' | 'en' {
  return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
}

function speechLang(code: string): string {
  if (code === 'hi' || code === 'hi-en') return 'hi-IN';
  return 'en-IN';
}

export function useVoice({
  sessionId, sourceIds, analysisMode, onChatResponse,
}: UseVoiceOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [languageCode, setLanguage] = useState('en');
  const [confidence, setConfidence] = useState(1.0);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(8);

  const stateRef = useRef<VoiceState>('idle');
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTranscriptRef = useRef('');
  const pendingConfidenceRef = useRef(0.8);

  const setStateSafe = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const stopAudio = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stopSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
    setCountdown(8);
  }, []);

  const stopRecording = useCallback(async () => {
    stopSilenceTimer();
    webSpeech.stop();

    if (stateRef.current !== 'recording') return;
    setStateSafe('transcribing');

    // Give speech recognition a brief moment to emit final onresult.
    await new Promise(r => setTimeout(r, 250));

    const text = pendingTranscriptRef.current.trim();
    if (!text) {
      setError('No speech detected. Please try again.');
      setStateSafe('error');
      return;
    }

    const lang = detectLanguage(text);
    setTranscript(text);
    setLanguage(lang);
    setConfidence(pendingConfidenceRef.current || 0.8);
    setStateSafe('confirming');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSilenceTimer, setStateSafe]);

  const startSilenceTimer = useCallback(() => {
    setCountdown(8);
    silenceTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          void stopRecording();
          return 8;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopRecording]);

  const webSpeech = useSpeechRecognition(
    (text, conf) => {
      pendingTranscriptRef.current = text || '';
      pendingConfidenceRef.current = conf ?? 0.8;
      if (stateRef.current === 'recording') {
        void stopRecording();
      }
    },
    () => {
      if (stateRef.current === 'recording') {
        setError('Voice recognition failed. Please try again.');
        setStateSafe('error');
      }
    },
  );

  const startRecording = useCallback(async () => {
    setError(null);
    pendingTranscriptRef.current = '';
    pendingConfidenceRef.current = 0.8;

    setStateSafe('recording');
    startSilenceTimer();

    // Prefer Hindi locale for broader India-language capture; English still works.
    if (webSpeech.isSupported) webSpeech.start('hi-IN');
    else {
      setError('Speech recognition is not supported in this browser.');
      setStateSafe('error');
    }
  }, [startSilenceTimer, webSpeech, setStateSafe]);

  const stopSpeaking = useCallback(() => {
    stopAudio();
    setStateSafe('idle');
  }, [stopAudio, setStateSafe]);

  const toggleRecording = useCallback(async () => {
    if (stateRef.current === 'idle') await startRecording();
    else if (stateRef.current === 'recording') await stopRecording();
    else if (stateRef.current === 'speaking') stopSpeaking();
  }, [startRecording, stopRecording, stopSpeaking]);

  const runPipeline = async (questionEn: string, originalText: string) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: withTimeout(45000),
      body: JSON.stringify({
        session_id: sessionId,
        message: questionEn,
        mode: analysisMode,
        source_ids: sourceIds,
        voice_mode: true,
        original_transcript: originalText,
        response_language: languageCode,
      }),
    });

    const response = await res.json();
    if (!res.ok || response?.error) {
      throw new Error(response?.error || `Chat request failed (${res.status})`);
    }

    onChatResponse(response, originalText);
    setStateSafe('speaking');
    const text = response.insight_narrative || response.insight || 'Analysis complete.';
    await speakText(text, speechLang(languageCode), 0.94);
  };

  const confirmTranscript = useCallback(async (finalText: string) => {
    if (stateRef.current !== 'confirming') return;
    setStateSafe('validating');

    const lang = detectLanguage(finalText);

    const vf = new FormData();
    vf.append('transcript', finalText);
    vf.append('language_code', lang);
    vf.append('session_id', sessionId);

    try {
      const vRes = await fetch('/api/voice/validate', {
        method: 'POST',
        body: vf,
        signal: withTimeout(20000),
      });
      const validation = await vRes.json();

      if (!vRes.ok || validation.error) {
        setError(validation.error || 'Validation failed. Please try again.');
        setStateSafe('error');
        return;
      }

      if (validation.status !== 'valid') {
        const msg = validation.rejection_message || 'This question is not answerable from connected data.';
        await speakText(msg, speechLang(lang), 0.94);
        setError(msg);
        setStateSafe('idle');
        setRetryCount(0);
        return;
      }

      setStateSafe('thinking');
      const thinkMsg = lang === 'hi'
        ? 'ठीक है, मैं डेटा देख रहा हूँ।'
        : 'Okay, I am analyzing your data.';
      void speakText(thinkMsg, speechLang(lang), 0.96);

      await runPipeline(validation.question_english || finalText, finalText);

      setStateSafe('idle');
      setRetryCount(0);
    } catch {
      setError('Something went wrong. Please try again.');
      setStateSafe('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, languageCode, setStateSafe]);

  const retryRecording = useCallback(() => {
    const newCount = retryCount + 1;
    setRetryCount(newCount);
    setTranscript('');
    setStateSafe('idle');
    if (newCount >= 3) setError('Having trouble? You can also type your question below.');
  }, [retryCount, setStateSafe]);

  const reset = useCallback(() => {
    stopAudio();
    stopSilenceTimer();
    webSpeech.stop();
    pendingTranscriptRef.current = '';
    setStateSafe('idle');
    setTranscript('');
    setError(null);
    setRetryCount(0);
  }, [stopAudio, stopSilenceTimer, webSpeech, setStateSafe]);

  return {
    state,
    transcript,
    languageCode,
    confidence,
    retryCount,
    error,
    countdown,
    silenceCountdown: 0,
    startRecording,
    stopRecording,
    toggleRecording,
    confirmTranscript,
    retryRecording,
    reset,
    isRecording: state === 'recording',
    isProcessing: ['transcribing', 'validating', 'thinking'].includes(state),
    isSpeaking: state === 'speaking',
  };
}
