/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic palette (CIELAB-derived, hex approximations)
        canvas:     '#EAF4F6',   // --background
        ink:        '#06090F',   // --foreground
        border:     '#BEC9CE',   // --border
        ring:       '#1C7CA6',   // --ring  (primary interactive)

        // Ring scale for hover/active variants
        'ring-light': '#D0E9F3',
        'ring-dark':  '#155E80',

        // Neutral greys derived from canvas/ink
        surface:    '#FFFFFF',
        'surface-raised': '#F3F8FA',
        'surface-sunken': '#E2EEF1',

        muted:      '#5A7080',
        subtle:     '#8CA3AE',
        placeholder: '#9DB5BE',

        // Status (stay within cool-toned palette)
        success:    '#1A8C5B',
        'success-bg': '#E6F6EF',
        warning:    '#996A00',
        'warning-bg': '#FFF7E0',
        danger:     '#C0392B',
        'danger-bg': '#FDECEA',
        info:       '#1C7CA6',
        'info-bg':  '#EAF4F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(28 124 166 / 0.06), 0 1px 2px -1px rgb(28 124 166 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(28 124 166 / 0.08), 0 2px 4px -2px rgb(28 124 166 / 0.08)',
        'dropdown': '0 10px 15px -3px rgb(6 9 15 / 0.10), 0 4px 6px -4px rgb(6 9 15 / 0.06)',
        'modal':   '0 20px 25px -5px rgb(6 9 15 / 0.12), 0 8px 10px -6px rgb(6 9 15 / 0.08)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
