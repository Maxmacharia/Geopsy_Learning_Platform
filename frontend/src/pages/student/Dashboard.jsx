import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bookmark, TrendingUp, LayoutDashboard, ArrowRight, Award, ClipboardList, Clock, CheckCircle } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import CourseCard from '../../components/courses/CourseCard'
import Badge from '../../components/ui/Badge'
import useAuthStore from '../../store/authStore'
import { usersApi, coursesApi, attemptsApi, certificatesApi } from '../../services/api'

export default function Dashboard() {
  const { user }                      = useAuthStore()
  const [bookmarks, setBookmarks]     = useState([])
  const [progress, setProgress]       = useState([])
  const [recent, setRecent]           = useState([])
  const [attempts, setAttempts]       = useState([])
  const [certs, setCerts]             = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      usersApi.bookmarks(),
      usersApi.progress(),
      coursesApi.list({ limit: 4 }),
      attemptsApi.myAttempts(),
      certificatesApi.mine(),
    ]).then(([bm, pg, rc, at, ct]) => {
      setBookmarks(bm.data)
      setProgress(pg.data)
      setRecent(rc.data.items)
      setAttempts(at.data)
      setCerts(ct.data)
    }).finally(() => setLoading(false))
  }, [])

  const completed   = progress.filter(p => p.completed).length
  const inProgress  = progress.filter(p => p.percent_complete > 0 && !p.completed).length
  const pendingGrade = attempts.filter(a => a.status === 'awaiting_manual_grading').length
  const recentAttempts = attempts.slice(0, 3)

  const STATS = [
    { label: 'Bookmarks',       value: bookmarks.length, icon: Bookmark,       color: 'bg-info-bg text-ring',         link: '/bookmarks' },
    { label: 'In Progress',     value: inProgress,       icon: TrendingUp,     color: 'bg-warning-bg text-warning',   link: '/progress' },
    { label: 'Lessons Done',    value: completed,        icon: BookOpen,       color: 'bg-success-bg text-success',   link: '/progress' },
    { label: 'Certificates',    value: certs.length,     icon: Award,          color: 'bg-surface-raised text-muted', link: '/my-quizzes' },
  ]

  const ATTEMPT_STATUS = {
    in_progress:             { label: 'In Progress',    variant: 'ring' },
    submitted:               { label: 'Submitted',      variant: 'neutral' },
    awaiting_manual_grading: { label: 'Awaiting Grade', variant: 'warning' },
    graded:                  { label: 'Graded',         variant: 'success' },
    auto_graded:             { label: 'Graded',         variant: 'success' },
  }

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="heading-1 mb-1">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted text-sm">{user?.institution || 'GeoPsy Learner'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map(({ label, value, icon: Icon, color, link }) => (
            <Link key={label} to={link} className="card p-5 hover:shadow-card-md transition-shadow group">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-ink">{loading ? '—' : value}</div>
              <div className="text-xs text-muted mt-0.5 flex items-center justify-between">
                {label}
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Bookmarks preview */}
          <div className="md:col-span-2">
            {!loading && bookmarks.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="heading-3">Your Bookmarks</h2>
                  <Link to="/bookmarks" className="text-sm text-ring hover:underline flex items-center gap-1">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="space-y-2 mb-8">
                  {bookmarks.slice(0, 3).map(b => (
                    <Link
                      key={b.bookmark_id}
                      to={`/courses/${b.slug}`}
                      className="card p-3 flex items-center gap-3 hover:shadow-card-md transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-info-bg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-ring" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink group-hover:text-ring transition-colors truncate">{b.title}</p>
                        <p className="text-2xs text-subtle uppercase tracking-wider">{b.category}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Recent quiz activity */}
            {recentAttempts.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="heading-3">Recent Quiz Activity</h2>
                  <Link to="/my-quizzes" className="text-sm text-ring hover:underline flex items-center gap-1">
                    View all <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentAttempts.map(a => {
                    const meta = ATTEMPT_STATUS[a.status] || { label: a.status, variant: 'neutral' }
                    return (
                      <div key={a.id} className="card p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.passed ? 'bg-success-bg' : a.passed === false ? 'bg-danger-bg' : 'bg-surface-raised'}`}>
                          {a.passed ? <CheckCircle className="w-4 h-4 text-success" />
                            : a.status === 'awaiting_manual_grading' ? <Clock className="w-4 h-4 text-warning" />
                            : <ClipboardList className="w-4 h-4 text-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{a.quiz_title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            {a.percentage > 0 && <span className="text-xs text-muted">{a.percentage.toFixed(1)}%</span>}
                          </div>
                        </div>
                        {a.status === 'graded' && (
                          <Link to={`/quiz-attempts/${a.id}/result`} className="btn-ghost text-xs flex-shrink-0">Result</Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Certificates earned */}
            {certs.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="heading-4">Certificates</h3>
                  <Link to="/my-quizzes" className="text-xs text-ring hover:underline">View all</Link>
                </div>
                <div className="space-y-2">
                  {certs.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-info-bg rounded-lg">
                      <Award className="w-4 h-4 text-ring flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{c.course_name}</p>
                        <p className="text-2xs text-muted">{c.final_score_pct?.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending grades alert */}
            {pendingGrade > 0 && (
              <div className="card p-4 bg-warning-bg border-warning/20">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-warning">{pendingGrade} submission{pendingGrade > 1 ? 's' : ''} awaiting grading</p>
                    <p className="text-xs text-muted mt-0.5">Your instructor will review and provide feedback soon.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-3">Recent Courses</h2>
            <Link to="/courses" className="text-sm text-ring hover:underline flex items-center gap-1">
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-52 animate-pulse bg-surface-raised" />)
              : recent.map(c => <CourseCard key={c.id} course={c} />)
            }
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
