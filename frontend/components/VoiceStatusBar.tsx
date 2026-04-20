'use client';
import { VoiceState } from '@/hooks/useVoice';

interface Props { state: VoiceState; language: string; }

const LABELS: Record<string, Record<string, string>> = {
  recording:    { en: 'Listening...', hi: 'सुन रहा हूँ...', 'hi-en': 'Listening...' },
  transcribing: { en: 'Processing audio...', hi: 'Audio process हो रहा है...', 'hi-en': 'Processing audio...' },
  validating:   { en: 'Checking your question...', hi: 'सवाल जाँच रहा हूँ...', 'hi-en': 'Checking...' },
  thinking:     { en: 'Analysing data...', hi: 'डेटा विश्लेषण हो रहा है...', 'hi-en': 'Analysing...' },
  speaking:     { en: 'Speaking...', hi: 'जवाब बोल रहा हूँ...', 'hi-en': 'Speaking...' },
};

const COLORS: Record<string, string> = {
  recording: '#f59e0b',
  transcribing: '#f59e0b',
  validating: '#3b82f6',
  thinking: '#3b82f6',
  speaking: '#10b981',
};

export default function VoiceStatusBar({ state, language }: Props) {
  if (['idle', 'confirming', 'error'].includes(state)) return null;
  const row  = LABELS[state] || {};
  const text = row[language] || row.en || '';
  if (!text) return null;

  const color = COLORS[state] || 'var(--text-muted)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      fontSize: '11px',
      fontFamily: 'monospace',
      color,
      marginBottom: 6,
    }}>
      <span>{text}</span>
      <span style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'currentColor',
              display: 'inline-block',
              animation: `vsb-pulse ${0.8 + i * 0.15}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes vsb-pulse {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
}
