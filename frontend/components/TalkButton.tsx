'use client';
import { VoiceState } from '@/hooks/useVoice';

interface Props {
  state: VoiceState;
  countdown: number;
  onClick: () => void;
}

export default function TalkButton({ state, countdown, onClick }: Props) {
  const isIdle       = state === 'idle';
  const isRecording  = state === 'recording';
  const isProcessing = ['transcribing', 'validating', 'thinking'].includes(state);
  const isSpeaking   = state === 'speaking';
  // Only processing states disable the button — speaking allows interruption click
  const disabled     = isProcessing;

  const borderColor = isRecording
    ? '#f59e0b'
    : isSpeaking
    ? '#10b981'
    : 'var(--border-default)';

  const bg = isRecording
    ? 'rgba(245,158,11,0.12)'
    : isSpeaking
    ? 'rgba(16,185,129,0.10)'
    : 'var(--bg-elevated)';

  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        title={
          isRecording  ? 'Click to stop recording' :
          isSpeaking   ? 'Click to stop speaking' :
          isProcessing ? 'Processing...' :
                         'Click to speak'
        }
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `1px solid ${borderColor}`,
          background: bg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s, background 0.15s',
          boxShadow: isRecording ? '0 0 8px rgba(245,158,11,0.35)' : isSpeaking ? '0 0 8px rgba(16,185,129,0.25)' : 'none',
          opacity: disabled ? 0.55 : 1,
          flexShrink: 0,
        }}
      >
        {/* Recording: show countdown */}
        {isRecording && (
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700, lineHeight: 1 }}>
            {countdown}s
          </span>
        )}

        {/* Speaking: show stop square (click to interrupt) */}
        {isSpeaking && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="#10b981">
            <rect x="1" y="1" width="9" height="9" rx="1.5"/>
          </svg>
        )}

        {/* Processing: spinner */}
        {isProcessing && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'tb-spin 1s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
            <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
          </svg>
        )}

        {/* Idle: mic icon */}
        {isIdle && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>
      <style>{`@keyframes tb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
