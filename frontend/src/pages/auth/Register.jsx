import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate  = useNavigate()
  const { register, user } = useAuthStore()
  const [form, setForm] = useState({ email: '', full_name: '', password: '', institution: '' })
  const [show, setShow]   = useState(false)
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/dashboard', { replace: true }); return null }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to GeoPsy 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-ring font-bold text-xl mb-4">
            <Globe className="w-6 h-6" />
            <span>GeoPsy Learning Platform</span>
          </Link>
          <h1 className="heading-2 mt-2">Create your free account</h1>
          <p className="text-muted text-sm mt-1">Start learning GIS today — no credit card required</p>
        </div>

        <div className="card-raised p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="full_name">Full Name *</label>
              <input id="full_name" className="input" placeholder="Jane Mwangi" value={form.full_name} onChange={set('full_name')} required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="reg_email">Email Address *</label>
              <input id="reg_email" className="input" type="email" placeholder="jane@university.ac.ke" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="institution">
                Institution <span className="text-muted font-normal normal-case">(optional)</span>
              </label>
              <input id="institution" className="input" placeholder="University of Nairobi, Moi University…" value={form.institution} onChange={set('institution')} />
            </div>
            <div>
              <label className="label" htmlFor="reg_password">Password *</label>
              <div className="relative">
                <input
                  id="reg_password"
                  className="input pr-10"
                  type={show ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 text-base mt-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative text-center"><span className="text-xs text-muted bg-surface px-3">or continue with</span></div>
          </div>

          <a href="/api/v1/auth/google" className="btn-secondary w-full py-2.5 text-sm">
            <GoogleIcon /> Google
          </a>

          <p className="text-center text-sm text-muted mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-ring font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
