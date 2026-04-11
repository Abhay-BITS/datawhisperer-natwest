import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-void':    '#ffffff',
        'bg-base':    '#f7f5fb',
        'bg-surface': '#ffffff',
        'bg-elevated':'#f0ecf7',
        'bg-overlay': '#ede8f4',
        'border-subtle':  '#ddd5ea',
        'border-default': '#c8bada',
        'border-strong':  '#9d85bb',
        'text-primary':   '#1a0a2e',
        'text-secondary': '#3d2060',
        'text-muted':     '#7a6394',
        accent:       '#42145f',
        'accent-dark':'#2d0e42',
        success: '#10b981',
        warning: '#f59e0b',
        error:   '#da1710',
        info:    '#3b82f6',
        'agent-semantic': '#7b2fa8',
        'agent-coder':    '#10b981',
        'agent-critic':   '#f59e0b',
        'agent-narrator': '#da1710',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease forwards',
        'slide-in': 'slide-in 0.3s ease forwards',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 15s ease infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
