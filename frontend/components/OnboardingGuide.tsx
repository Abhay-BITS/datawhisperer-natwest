'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnboarding, STEPS } from '@/hooks/useOnboarding';

export function OnboardingGuide() {
  const { currentStep, nextStep, prevStep, skipTour, isActive, isCompleted } = useOnboarding();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isCompleted || currentStep < 0 || !isActive) {
      setIsVisible(false);
      return;
    }

    // Small delay to allow page to settle/render
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const step = STEPS[currentStep];
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, 500);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentStep, isActive, isCompleted]);

  // Handle resize/scroll
  useEffect(() => {
    const update = () => {
      if (currentStep < 0 || !isActive) return;
      const step = STEPS[currentStep];
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentStep, isActive]);

  if (!isVisible || !targetRect) return null;

  const step = STEPS[currentStep];
  if (!step) return null;
  
  // Calculate tooltip position
  const pos = (step as any).position || 'bottom';
  const isTopLeft = pos === 'top-left';
  const isRight = pos === 'right';
  const isLeft = pos === 'left';
  
  let top = targetRect.bottom + window.scrollY + 10;
  let left = Math.min(
    window.innerWidth - 300, 
    Math.max(10, targetRect.left + window.scrollX - 50)
  );

  if (isTopLeft) {
    top = 40;
    left = 40;
  } else if (isRight || isLeft) {
    // Check if there is enough space on the side, otherwise fallback to bottom
    const spaceRight = window.innerWidth - targetRect.right;
    const spaceLeft = targetRect.left;
    
    if (isRight && spaceRight > 300) {
      top = targetRect.top + window.scrollY + (targetRect.height / 2) - 60;
      left = targetRect.right + window.scrollX + 15;
    } else if (isLeft && spaceLeft > 300) {
      top = targetRect.top + window.scrollY + (targetRect.height / 2) - 60;
      left = targetRect.left + window.scrollX - 295;
    } else {
      // Fallback to bottom-center if no side space
      top = targetRect.bottom + window.scrollY + 10;
      left = Math.min(window.innerWidth - 300, Math.max(10, targetRect.left + window.scrollX - 50));
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top,
      left,
      zIndex: 10000,
      width: 280,
      animation: 'fade-in 0.3s ease forwards',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--accent-dim)',
        borderRadius: 12,
        padding: '1rem',
        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Guide • Step {currentStep + 1}
          </span>
          <button onClick={skipTour} style={{ background: 'none', border: 'none', fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            Skip
          </button>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 400 }}>
          {step.message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <button 
            onClick={prevStep}
            disabled={currentStep === 0}
            style={{ 
              background: 'none', border: 'none', 
              fontSize: '0.75rem', color: 'var(--text-secondary)', 
              cursor: currentStep === 0 ? 'default' : 'pointer',
              opacity: currentStep === 0 ? 0.3 : 1
            }}
          >
            ← Back
          </button>
          <button 
            onClick={nextStep}
            style={{ 
              background: 'var(--accent)', border: 'none', 
              borderRadius: 6, padding: '4px 12px',
              fontSize: '0.75rem', fontWeight: 600, color: '#fff', 
              cursor: 'pointer'
            }}
          >
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Got it!'}
          </button>
        </div>
      </div>
      
      {/* Arrow */}
      {(!isTopLeft && !isRight && !isLeft) && (
        <div style={{
          position: 'absolute', top: -6, left: 60, width: 12, height: 12,
          background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(10px)',
          borderLeft: '1px solid var(--accent-dim)', borderTop: '1px solid var(--accent-dim)',
          transform: 'rotate(45deg)',
        }} />
      )}
      {isRight && (
        <div style={{
          position: 'absolute', top: 54, left: -6, width: 12, height: 12,
          background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(10px)',
          borderLeft: '1px solid var(--accent-dim)', borderBottom: '1px solid var(--accent-dim)',
          transform: 'rotate(45deg)',
        }} />
      )}
      {isLeft && (
        <div style={{
          position: 'absolute', top: 54, right: -6, width: 12, height: 12,
          background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(10px)',
          borderRight: '1px solid var(--accent-dim)', borderTop: '1px solid var(--accent-dim)',
          transform: 'rotate(45deg)',
        }} />
      )}
    </div>
  );
}
