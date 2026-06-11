import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF7F2',
          2: '#F4EFE6',
          3: '#EBE4D8',
        },
        canvas: '#FDFBF8',
        ink: {
          DEFAULT: '#1a2030',
          2: '#2d3548',
          3: '#4a5568',
          deep: '#0A0A0A',
        },
        muted: {
          DEFAULT: '#6b7585',
          2: '#8a929e',
        },
        line: {
          DEFAULT: '#E5DDD2',
          2: '#D9D0C3',
        },
        ochre: {
          DEFAULT: '#c4a86a',
          soft: '#F3EBD9',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2C06A',
          dark: '#B8943E',
        },
        action: '#2d7a5f',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(20,30,60,0.04), 0 6px 16px -8px rgba(20,30,60,0.10)',
        'card-lg': '0 1px 0 rgba(20,30,60,0.05), 0 18px 40px -16px rgba(20,30,60,0.18)',
        glow: '0 0 40px rgba(201, 168, 76, 0.12)',
        'glow-sm': '0 0 20px rgba(201, 168, 76, 0.1)',
      },
      animation: {
        'gradient-shift': 'gradient-shift 12s ease infinite',
        float: 'float 8s ease-in-out infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
