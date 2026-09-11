/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic palette (exact hex spec)
        canvas:     '#E8F8FF',   // --background
        ink:        '#080B14',   // --foreground
        border:     '#B9C6D0',   // --border
        ring:       '#297AA4',   // --ring (primary interactive)
        surface:    '#FFFFFF',   // --white

        'ring-light': '#D6ECF5',
        'ring-dark':  '#1D5A7A',

        'surface-raised': '#F3FAFD',
        'surface-sunken': '#DCEEF5',

        muted:       '#4D6072',
        subtle:      '#7E92A0',
        placeholder: '#9FB2BD',

        success:     '#1A8C5B',
        'success-bg': '#E6F6EF',
        warning:     '#996A00',
        'warning-bg': '#FFF7E0',
        danger:      '#C0392B',
        'danger-bg': '#FDECEA',
        info:        '#297AA4',
        'info-bg':   '#E8F8FF',
      },
      fontFamily: {
        sans: [
          'Source Code Pro', 'Geist', 'Geist Fallback',
          'ui-sans-serif', 'system-ui', '-apple-system',
          'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'monospace'],
      },
      fontSize: { '2xs': ['0.625rem', { lineHeight: '0.875rem' }] },
      borderRadius: { DEFAULT: '0.5rem', sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.25rem' },
      boxShadow: {
        card:      '0 1px 3px 0 rgb(41 122 164 / 0.06), 0 1px 2px -1px rgb(41 122 164 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(41 122 164 / 0.08), 0 2px 4px -2px rgb(41 122 164 / 0.08)',
        dropdown:  '0 10px 15px -3px rgb(8 11 20 / 0.10), 0 4px 6px -4px rgb(8 11 20 / 0.06)',
        modal:     '0 20px 25px -5px rgb(8 11 20 / 0.12), 0 8px 10px -6px rgb(8 11 20 / 0.08)',
      },
      spacing: { '18': '4.5rem', '88': '22rem' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [],
}
