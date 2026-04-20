'use client';
import { useState, useEffect } from 'react';

interface Props {
  transcript: string;
  languageCode: string;
  confidence: number;
  retryCount: number;
  onConfirm: (text: string) => void;
  onRetry: () => void;
}

const LABELS: Record<string, { heard: string; yes: string; no: string; edit: string; sec: string }> = {
  en:      { heard: 'I heard:', yes: 'Yes, proceed', no: 'Speak again', edit: 'Edit', sec: 's' },
  hi:      { heard: 'मैंने सुना:', yes: 'हाँ, सही है', no: 'फिर बोलें', edit: 'बदलें', sec: 'स' },
  'hi-en': { heard: 'I heard:', yes: 'Yes / हाँ', no: 'No / नहीं', edit: 'Edit', sec: 's' },
  bn:      { heard: 'আমি শুনলাম:', yes: 'হ্যাঁ, সঠিক', no: 'আবার বলুন', edit: 'সম্পাদনা', sec: 'স' },
  ta:      { heard: 'கேட்டேன்:', yes: 'ஆம், சரி', no: 'மீண்டும் பேசு', edit: 'திருத்து', sec: 's' },
  te:      { heard: 'విన్నాను:', yes: 'అవును, సరి', no: 'మళ్ళీ చెప్పు', edit: 'సవరించు', sec: 's' },
  gu:      { heard: 'મેં સાંભળ્યું:', yes: 'હા, સાચું', no: 'ફરી બોલો', edit: 'સુધારો', sec: 's' },
  kn:      { heard: 'ಕೇಳಿದೆ:', yes: 'ಹೌದು, ಸರಿ', no: 'ಮತ್ತೆ ಹೇಳಿ', edit: 'ತಿದ್ದು', sec: 's' },
  ml:      { heard: 'കേട്ടു:', yes: 'അതെ, ശരി', no: 'വീണ്ടും പറയൂ', edit: 'തിരുത്തൂ', sec: 's' },
  mr:      { heard: 'मी ऐकले:', yes: 'हो, बरोबर', no: 'पुन्हा बोला', edit: 'बदला', sec: 's' },
  pa:      { heard: 'ਮੈਂ ਸੁਣਿਆ:', yes: 'ਹਾਂ, ਸਹੀ', no: 'ਫਿਰ ਬੋਲੋ', edit: 'ਬਦਲੋ', sec: 's' },
};

export default function ConfirmationGate({
  transcript, languageCode, confidence, retryCount, onConfirm, onRetry,
}: Props) {
  const [editMode, setEditMode]   = useState(false);
  const [edited, setEdited]       = useState(transcript);
  const [countdown, setCountdown] = useState(5);
  const isLowConf = confidence < 0.70;
  const L = LABELS[languageCode] || LABELS.en;

  useEffect(() => { if (isLowConf) setEditMode(true); }, [isLowConf]);
  useEffect(() => { setEdited(transcript); }, [transcript]);

  useEffect(() => {
    if (editMode || isLowConf) return;
    setCountdown(5);
    const t = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) {
          clearInterval(t); // stop the interval immediately — never fire again
          onConfirm(transcript);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [editMode, isLowConf, transcript, onConfirm]);

  return (
    <div style={{
      marginBottom: 6,
      padding: '10px 14px',
      background: 'var(--bg-elevated)',
      borderRadius: 8,
      border: '1px solid var(--border-default)',
      borderLeft: '3px solid #f59e0b',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        {L.heard}
        {isLowConf && (
          <span style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '1px 6px', borderRadius: 4, fontSize: '10px' }}>
            Please check
          </span>
        )}
        {retryCount > 0 && (
          <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4, fontSize: '10px' }}>
            Attempt {retryCount + 1}
          </span>
        )}
      </div>

      {/* Transcript / Edit */}
      {editMode ? (
        <textarea
          value={edited}
          onChange={e => setEdited(e.target.value)}
          autoFocus
          rows={2}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid #3b82f6',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            padding: '7px 10px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <div style={{
          fontSize: '13px',
          color: 'var(--text-primary)',
          padding: '7px 10px',
          background: 'var(--bg-surface)',
          borderRadius: 6,
          lineHeight: 1.5,
          marginBottom: 8,
          fontFamily: 'var(--font-body)',
        }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {editMode ? (
          <button onClick={() => { onConfirm(edited); setEditMode(false); }} style={btnStyle('#10b981', 'rgba(16,185,129,0.08)')}>
            Use this
          </button>
        ) : (
          <>
            <button onClick={() => onConfirm(transcript)} style={btnStyle('#10b981', 'rgba(16,185,129,0.08)')}>
              {L.yes} <span style={{ opacity: 0.5, fontSize: '10px', marginLeft: 4 }}>({countdown}{L.sec})</span>
            </button>
            <button onClick={onRetry} style={btnStyle('#f59e0b', 'rgba(245,158,11,0.08)')}>
              {L.no}
            </button>
            <button onClick={() => { setEditMode(true); setCountdown(99); }} style={btnStyle('var(--text-secondary)', 'var(--bg-surface)')}>
              {L.edit}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: 999,
    border: `1px solid ${color}30`,
    background: bg,
    color,
    fontSize: '11px',
    fontFamily: 'monospace',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  };
}
