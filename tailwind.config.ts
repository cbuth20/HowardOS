import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Howard Brand Colors
        brand: {
          primary: '#758C7C',      // Sage green
          navy: '#465352',         // Dark teal-gray
          sage: '#758C7C',         // Sage green (alias)
          slate: '#8A9DAA',        // Slate blue
          terracotta: '#D3986F',   // Terracotta/tan
        },
        // Neutral colors - Enhanced
        neutral: {
          black: '#101010',
          white: '#FFFFFF',
          cream: '#FBF4EA',        // Howard cream
          border: '#E0E0E0',       // Lighter border
          'border-dark': '#C4C4C4', // Darker border
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
        },
        // Accent colors
        accent: {
          sage: '#758C7C',         // Sage green
          slate: '#8A9DAA',        // Slate blue
          terracotta: '#D3986F',   // Terracotta
        },
        // Semantic colors - Enhanced with depth layers
        background: {
          DEFAULT: '#FFFFFF',      // Pure white - main content
          subtle: '#FBF4EA',       // Howard cream - page background
          card: '#FEFEFE',         // Off-white - elevated cards
          elevated: '#F9F9F9',     // Light gray - secondary cards
          hover: '#F5F5F5',        // Hover state for interactive elements
          muted: '#F0F0F0',        // Muted backgrounds
          overlay: 'rgba(70, 83, 82, 0.6)', // Modal backdrop (brand navy)
        },
        text: {
          primary: '#465352',      // Dark teal-gray
          secondary: '#5A6868',    // Lighter variant
          muted: '#8A9DAA',        // Slate blue
          inverse: '#FFFFFF',
        },
        state: {
          success: '#758C7C',      // Sage green
          'success-light': '#E8F0ED', // Light sage bg
          warning: '#D3986F',      // Terracotta
          'warning-light': '#F9F1E8', // Light terracotta bg
          error: '#C85A54',        // Muted red
          'error-light': '#F9E8E7',   // Light red bg
          info: '#8A9DAA',         // Slate blue
          'info-light': '#EEF1F4',    // Light slate bg
        },
        // Aliases for common usage
        border: '#E0E0E0',
        input: '#E0E0E0',
        ring: '#758C7C',
        primary: {
          DEFAULT: '#758C7C',      // Sage green
          foreground: '#FFFFFF',
          hover: '#6A7D6F',        // Darker sage
        },
        secondary: {
          DEFAULT: '#465352',      // Dark teal-gray
          foreground: '#FFFFFF',
          hover: '#3A4644',        // Darker teal
        },
        destructive: {
          DEFAULT: '#C85A54',
          foreground: '#FFFFFF',
          hover: '#B34E48',
        },
        muted: {
          DEFAULT: '#FBF4EA',
          foreground: '#8A9DAA',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-crimson)', 'Georgia', 'serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'md': '0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 8px 12px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'none': 'none',
      },
      opacity: {
        '0': '0',
        '5': '0.05',
        '10': '0.1',
        '15': '0.15',
        '20': '0.2',
        '25': '0.25',
        '30': '0.3',
        '40': '0.4',
        '50': '0.5',
        '60': '0.6',
        '70': '0.7',
        '75': '0.75',
        '80': '0.8',
        '90': '0.9',
        '95': '0.95',
        '100': '1',
      },
    },
  },
  plugins: [],
}

export default config
