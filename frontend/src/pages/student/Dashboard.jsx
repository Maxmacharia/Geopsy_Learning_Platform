import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Bookmark, TrendingUp, LayoutDashboard, ArrowRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import CourseCard from '../../components/courses/CourseCard'
import useAuthStore from '../../store/authStore'
import { usersApi, coursesApi } from '../../services/api'

export default function Dashboard() {
  const { user }                    = useAuthStore()
  const [bookmarks, setBookmarks]   = useState([])
  const [progress, setProgress]     = useState([])
  const [recent, setRecent]         = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      usersApi.bookmarks(),
      usersApi.progress(),
      coursesApi.list({ limit: 4 }),
    ]).then(([bm, pg, rc]) => {
      setBookmarks(bm.data)
      setProgress(pg.data)
      setRecent(rc.data.items)
    }).finally(() => setLoading(false))
  }, [])

  const completed   = progress.filter(p => p.completed).length
  const inProgress  = progress.filter(p => p.percent_complete > 0 && !p.completed).length

  const STATS = [
    { label: 'Bookmarks',       value: bookmarks.length, icon: Bookmark,       color: 'bg-info-bg text-ring' },
    { label: 'In Progress',     value: inProgress,       icon: TrendingUp,     color: 'bg-warning-bg text-warning' },
    { label: 'Completed',       value: completed,        icon: BookOpen,       color: 'bg-success-bg text-success' },
    { label: 'Lessons Tracked', value: progress.length,  icon: LayoutDashboard, color: 'bg-surface-raised text-muted' },
  ]

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="heading-1 mb-1">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted text-sm">
            {user?.institution || 'GeoPsy Learner'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-ink">{loading ? '—' : value}</div>
              <div className="text-xs text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Bookmarks preview */}
        {!loading && bookmarks.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-3">Your Bookmarks</h2>
              <Link to="/bookmarks" className="text-sm text-ring hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {bookmarks.slice(0, 4).map(b => (
                <Link
                  key={b.bookmark_id}
                  to={`/courses/${b.slug}`}
                  className="card p-4 hover:shadow-card-md transition-all group"
                >
                  <div className="text-2xs text-subtle uppercase tracking-wider mb-1">{b.category}</div>
                  <p className="text-sm font-semibold text-ink group-hover:text-ring transition-colors line-clamp-2">
                    {b.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

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
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card h-52 animate-pulse bg-surface-raised" />
                ))
              : recent.map(c => <CourseCard key={c.id} course={c} />)
            }
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
