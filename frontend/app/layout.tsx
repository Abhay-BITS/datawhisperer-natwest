import type { Metadata } from 'next'
import './globals.css'

import { OnboardingProvider } from '@/hooks/useOnboarding'
import { OnboardingGuide } from '@/components/OnboardingGuide'

export const metadata: Metadata = {
  title: 'DataWhisperer : Ask anything. Trust everything.',
  description: 'AI-powered analytics: connect your data, ask in plain English, get trustworthy insights.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
        <OnboardingProvider>
          {children}
          <OnboardingGuide />
        </OnboardingProvider>
      </body>
    </html>
  )
}
