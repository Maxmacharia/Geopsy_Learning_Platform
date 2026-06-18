import { Globe } from 'lucide-react'

export default function PageSpinner({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Globe className="w-8 h-8 text-ring animate-spin" />
        </div>
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
