import './PageSpinner.css'

export default function PageSpinner({ message = 'Loading…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <img src="/geopsy-logo.png" alt="GeoPsy" className="h-8 w-auto spinner-pulse" />
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}
