import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { usersApi } from '../../services/api'

export default function Progress() {
  const [progress, setProgress] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    usersApi.progress().then(({ data }) => setProgress(data)).finally(() => setLoading(false))
  }, [])

  const completed  = progress.filter(p => p.completed).length
  const inProgress = progress.filter(p => p.percent_complete > 0 && !p.completed).length

  const STATS = [
    { label: 'Total Tracked', value: progress.length, icon: TrendingUp,  color: 'bg-info-bg text-ring' },
    { label: 'In Progress',   value: inProgress,      icon: Clock,        color: 'bg-warning-bg text-warning' },
    { label: 'Completed',     value: completed,       icon: CheckCircle,  color: 'bg-success-bg text-success' },
  ]

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="heading-1 mb-1">Reading Progress</h1>
          <p className="text-muted">Track your journey through GIS lessons</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5 text-center">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mx-auto mb-3`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-ink">{loading ? '—' : value}</div>
              <div className="text-xs text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card h-14 animate-pulse bg-surface-raised" />
            ))}
          </div>
        ) : progress.length === 0 ? (
          <div className="text-center py-20 text-subtle">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted">No progress tracked yet</p>
            <p className="text-sm mt-1">Start reading lessons to track your progress</p>
            <Link to="/courses" className="btn-primary mt-5 inline-flex">
              Browse Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {progress.map(p => (
              <div key={p.lesson_id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">
                    Lesson <span className="text-muted font-normal">#{p.lesson_id.slice(0, 8)}</span>
                  </p>
                  {p.completed ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle className="w-3.5 h-3.5" /> Completed
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted">
                      {Math.round(p.percent_complete)}% read
                    </span>
                  )}
                </div>
                <div className="w-full bg-surface-raised rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${p.completed ? 'bg-success' : 'bg-ring'}`}
                    style={{ width: `${Math.min(100, p.percent_complete)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
