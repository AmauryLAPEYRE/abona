module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'abona-dark': {
          DEFAULT: '#0f172a',
          50: '#1e293b',
          100: '#1a2332',
          200: '#151d2b',
          300: '#111827',
          400: '#0d1320',
          500: '#0a0f19',
        },
        'abona-blue': {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        'abona-purple': {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
        },
        'abona-green': {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        'abona-accent': {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #2563eb, #7c3aed)',
        'gradient-dark': 'linear-gradient(to bottom, #111827, #1e3a5f)',
        'gradient-success': 'linear-gradient(to right, #059669, #10b981)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.45)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
