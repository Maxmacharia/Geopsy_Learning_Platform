const VARIANTS = {
  ring:    'badge-ring',
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  neutral: 'badge-neutral',
  // Legacy aliases kept for backward compat
  blue:    'badge-ring',
  green:   'badge-success',
  yellow:  'badge-warning',
  red:     'badge-danger',
  gray:    'badge-neutral',
  teal:    'badge-ring',
}

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`${VARIANTS[variant] || 'badge-neutral'} ${className}`}>
      {children}
    </span>
  )
}
