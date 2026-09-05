/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#07090e',
          900: '#0b0e14', // Deep obsidian canvas
          800: '#131822', // Elevated card / surface
          700: '#1e2638', // Border / separator
          600: '#2b354d',
          500: '#475569',
        },
        market: {
          green: '#10b981', // Emerald
          greenLight: '#34d399',
          greenMuted: '#064e3b',
          red: '#ef4444', // Crimson
          redLight: '#f87171',
          redMuted: '#7f1d1d',
        },
        brand: {
          blue: '#3b82f6',
          cyan: '#0ea5e9',
          purple: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'tick-green': 'tickGreen 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        'tick-red': 'tickRed 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        tickGreen: {
          '0%': { backgroundColor: 'rgba(16, 185, 129, 0.35)', color: '#34d399' },
          '100%': { backgroundColor: 'transparent' },
        },
        tickRed: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.35)', color: '#f87171' },
          '100%': { backgroundColor: 'transparent' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
