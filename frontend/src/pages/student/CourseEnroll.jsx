/**
 * CourseEnroll — Enrollment and M-Pesa payment flow.
 *
 * Flow:
 *  1. Shows course summary + price
 *  2. Free: immediately enrolls, redirects to course
 *  3. Paid: prompts for phone, initiates STK push, polls for confirmation
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Smartphone, CheckCircle, XCircle, Loader, ArrowLeft, BookOpen, Clock, Award } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { coursesApi, enrollmentApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const POLL_INTERVAL = 4000  // ms between enrollment status checks
const POLL_MAX      = 30    // max attempts (~2 min)

export default function CourseEnroll() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const [course, setCourse]       = useState(null)
  const [access, setAccess]       = useState(null)   // { has_access, status }
  const [loading, setLoading]     = useState(true)
  const [step, setStep]           = useState('preview')
  // preview | phone-entry | stk-sent | confirming | success | failed | already-enrolled

  const [phone, setPhone]         = useState(user?.phone_number || '')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollmentId, setEnrollmentId] = useState(null)
  const [checkoutId, setCheckoutId]     = useState(null)
  const pollRef  = useRef(null)
  const pollCount = useRef(0)

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    Promise.all([
      coursesApi.get(slug),
      enrollmentApi.checkAccess(slug).catch(() => ({ data: { has_access: false } })),
    ]).then(([courseRes, accessRes]) => {
      setCourse(courseRes.data)
      const acc = accessRes.data
      setAccess(acc)
      if (acc.has_access) {
        setStep('already-enrolled')
      }
    }).catch(() => navigate('/courses'))
    .finally(() => setLoading(false))

    return () => clearInterval(pollRef.current)
  }, [slug, user])

  // Poll for enrollment confirmation after STK push
  function startPolling(eid) {
    pollCount.current = 0
    pollRef.current = setInterval(async () => {
      pollCount.current += 1
      if (pollCount.current > POLL_MAX) {
        clearInterval(pollRef.current)
        setStep('failed')
        return
      }
      try {
        const { data: acc } = await enrollmentApi.checkAccess(course.id || slug)
        if (acc.has_access) {
          clearInterval(pollRef.current)
          setStep('success')
          setEnrollmentId(acc.enrollment_id)
        }
      } catch {/* keep polling */}
    }, POLL_INTERVAL)
  }

  async function handleEnroll() {
    if (!course) return

    if (course.price <= 0) {
      // Free course — enroll immediately
      setEnrolling(true)
      try {
        const { data } = await enrollmentApi.enroll({ course_id: course.id })
        setEnrollmentId(data.enrollment_id)
        setStep('success')
        toast.success('Enrolled successfully!')
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Enrollment failed')
        setStep('failed')
      }
      setEnrolling(false)
      return
    }

    // Paid course — proceed to phone entry
    setStep('phone-entry')
  }

  async function handleStkPush() {
    if (!phone.trim()) { toast.error('Please enter your M-Pesa phone number'); return }
    setEnrolling(true)
    try {
      const { data } = await enrollmentApi.enroll({ course_id: course.id, phone_number: phone.trim() })
      if (data.status === 'enrolled') {
        // Already enrolled (e.g. free course)
        setStep('success')
        setEnrollmentId(data.enrollment_id)
      } else {
        setCheckoutId(data.checkout_request_id)
        setEnrollmentId(data.enrollment_id)
        setStep('stk-sent')
        // Start polling for confirmation
        startPolling(data.enrollment_id)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment initiation failed. Please try again.')
      setStep('failed')
    }
    setEnrolling(false)
  }

  if (loading) return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-8 bg-surface-raised rounded w-2/3" />
        <div className="h-4 bg-surface-raised rounded w-full" />
        <div className="h-32 bg-surface-raised rounded" />
      </div>
    </PageWrapper>
  )

  if (!course) return null

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link to={`/courses/${slug}`} className="btn-ghost text-sm mb-6 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to course
        </Link>

        {/* ── Already enrolled ─────────────────────────────────────────── */}
        {step === 'already-enrolled' && (
          <div className="card p-8 text-center">
            <CheckCircle className="w-14 h-14 text-success mx-auto mb-4" />
            <h1 className="heading-2 mb-2">You're already enrolled!</h1>
            <p className="text-muted mb-2">Status: <span className="font-semibold text-ink capitalize">{access?.status?.replace(/_/g, ' ')}</span></p>
            <p className="text-muted mb-6">{course.title}</p>
            <Link to={`/courses/${slug}`} className="btn-primary">Continue Learning</Link>
          </div>
        )}

        {/* ── Preview / confirm enrollment ─────────────────────────────── */}
        {step === 'preview' && (
          <div className="card p-8">
            <div className="mb-6">
              <h1 className="heading-2 mb-2">{course.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-ring capitalize">{course.difficulty}</span>
                {course.price > 0
                  ? <span className="badge bg-success-bg text-success">KES {course.price.toLocaleString()}</span>
                  : <span className="badge bg-success-bg text-success">Free</span>
                }
              </div>
              <p className="text-muted text-sm">{course.description?.replace(/<[^>]*>/g, '').slice(0, 200)}…</p>
            </div>

            {/* Course stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: BookOpen, label: 'Lessons',   value: course.lesson_count || '—' },
                { icon: Clock,    label: 'Self-paced', value: '6–8 hrs' },
                { icon: Award,    label: 'Certificate', value: 'Included' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-surface-raised rounded-xl p-3 text-center">
                  <Icon className="w-5 h-5 text-ring mx-auto mb-1" />
                  <p className="text-xs font-bold text-ink">{value}</p>
                  <p className="text-2xs text-muted">{label}</p>
                </div>
              ))}
            </div>

            {/* Prerequisite warning */}
            {course.prerequisite_id && (
              <div className="card p-3 bg-warning-bg border-warning/20 text-sm text-warning mb-5">
                <Lock className="w-4 h-4 inline mr-1.5 mb-0.5" />
                This course has a prerequisite. You must complete the required course before enrolling.
              </div>
            )}

            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {enrolling ? 'Processing…' : course.price > 0 ? `Enroll — KES ${course.price.toLocaleString()}` : 'Enroll Free'}
            </button>
            <p className="text-xs text-subtle text-center mt-3">
              {course.price > 0 ? 'Secure payment via M-Pesa. No card required.' : 'This course is completely free.'}
            </p>
          </div>
        )}

        {/* ── Phone entry ───────────────────────────────────────────────── */}
        {step === 'phone-entry' && (
          <div className="card p-8">
            <div className="flex items-center justify-center w-14 h-14 bg-info-bg rounded-2xl mx-auto mb-5">
              <Smartphone className="w-7 h-7 text-ring" />
            </div>
            <h1 className="heading-2 text-center mb-1">M-Pesa Payment</h1>
            <p className="text-muted text-sm text-center mb-6">
              You will receive an M-Pesa prompt on your phone. Enter your PIN to complete enrollment.
            </p>

            <div className="bg-surface-raised rounded-xl p-4 mb-5 flex items-center justify-between">
              <span className="text-muted text-sm">{course.title}</span>
              <span className="font-bold text-ink">KES {course.price.toLocaleString()}</span>
            </div>

            <div className="mb-5">
              <label className="label">M-Pesa Phone Number *</label>
              <input
                className="input text-base"
                type="tel"
                placeholder="07XX XXX XXX or 2547XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-subtle mt-1">Enter the number registered with M-Pesa</p>
            </div>

            <button
              onClick={handleStkPush}
              disabled={enrolling}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {enrolling ? <><Loader className="w-4 h-4 animate-spin" /> Sending prompt…</> : 'Send M-Pesa Prompt'}
            </button>
            <button onClick={() => setStep('preview')} className="btn-ghost w-full justify-center mt-3 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}

        {/* ── STK sent — waiting ────────────────────────────────────────── */}
        {step === 'stk-sent' && (
          <div className="card p-10 text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <Smartphone className="w-16 h-16 text-ring opacity-20" />
              <Loader className="w-8 h-8 text-ring animate-spin absolute inset-0 m-auto" />
            </div>
            <h2 className="heading-2 mb-2">Check your phone</h2>
            <p className="text-muted mb-1">
              An M-Pesa payment prompt has been sent to <strong className="text-ink">{phone}</strong>.
            </p>
            <p className="text-muted text-sm mb-6">Enter your M-Pesa PIN to complete enrollment. This page will update automatically.</p>
            <div className="flex items-center justify-center gap-2 text-subtle text-xs">
              <Loader className="w-3 h-3 animate-spin" />
              Waiting for payment confirmation…
            </div>
            <button onClick={() => { clearInterval(pollRef.current); setStep('preview') }} className="btn-ghost text-sm mt-6">
              Cancel
            </button>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="card p-10 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="heading-2 mb-2">You're enrolled! 🎉</h2>
            <p className="text-muted mb-6">Welcome to <strong className="text-ink">{course.title}</strong>. Your learning journey starts now.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={`/courses/${slug}`} className="btn-primary">Start Learning</Link>
              <Link to="/dashboard" className="btn-secondary">Go to Dashboard</Link>
            </div>
          </div>
        )}

        {/* ── Failed ────────────────────────────────────────────────────── */}
        {step === 'failed' && (
          <div className="card p-10 text-center">
            <XCircle className="w-14 h-14 text-danger mx-auto mb-4" />
            <h2 className="heading-2 mb-2">Payment not confirmed</h2>
            <p className="text-muted mb-6">
              The M-Pesa payment was not confirmed within the expected time, or was cancelled.
              Your enrollment has not been activated. You can try again.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep('phone-entry')} className="btn-primary">Try Again</button>
              <Link to={`/courses/${slug}`} className="btn-secondary">Back to Course</Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
