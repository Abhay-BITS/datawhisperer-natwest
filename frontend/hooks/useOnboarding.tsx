'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  setStep: (step: number) => void;
  isActive: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const STEPS = [
  { id: 'auth-card', path: '/auth', message: 'Welcome to DataWhisperer! Enter any username & password to start your journey.', position: 'right' },
  { id: 'source-add', path: '/sources', message: "First, let's connect some data. Click here to add a database or upload a file." },
  { id: 'wizard-sample', path: '/sources', message: 'Not ready to connect your own? Use our banking sample data to explore immediately!' },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 means loading
  const [isCompleted, setIsCompleted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const completed = localStorage.getItem('dw_onboarding_completed') === 'true';
    const storedStep = parseInt(localStorage.getItem('dw_onboarding_step') || '0', 10);
    
    if (completed) {
      setIsCompleted(true);
      setCurrentStep(STEPS.length);
    } else {
      setCurrentStep(storedStep);
    }
  }, []);

  useEffect(() => {
    if (currentStep >= 0 && currentStep < STEPS.length) {
      localStorage.setItem('dw_onboarding_step', currentStep.toString());
    }
  }, [currentStep]);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      // Auto-navigate if the path changes
      if (STEPS[nextIdx].path !== pathname) {
        router.push(STEPS[nextIdx].path);
      }
    } else {
      skipTour();
    }
  }, [currentStep, pathname, router]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      if (STEPS[prevIdx].path !== pathname) {
        router.push(STEPS[prevIdx].path);
      }
    }
  }, [currentStep, pathname, router]);

  const skipTour = useCallback(() => {
    setIsCompleted(true);
    setCurrentStep(STEPS.length);
    localStorage.setItem('dw_onboarding_completed', 'true');
  }, []);

  const setStep = useCallback((step: number) => {
    if (step >= 0 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  // Sync step with path if user navigates manually but hasn't completed
  useEffect(() => {
    if (!isCompleted && currentStep >= 0 && currentStep < STEPS.length) {
       const stepPath = STEPS[currentStep].path;
       // If we're on a path that doesn't match the current step's expected path, 
       // but fits a FUTURE step, jump to it? Let's keep it simple for now and just check if we need to show.
    }
  }, [pathname, isCompleted, currentStep]);

  const isActive = currentStep >= 0 && currentStep < STEPS.length && STEPS[currentStep].path === pathname;

  return (
    <OnboardingContext.Provider value={{
      currentStep,
      totalSteps: STEPS.length,
      isCompleted,
      nextStep,
      prevStep,
      skipTour,
      setStep,
      isActive
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
