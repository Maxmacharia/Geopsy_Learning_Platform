import { useEffect, useState } from 'react'
import { Users, BookOpen, Download, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { analyticsApi } from '../../services/api'

export default function AdminDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.overview().then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [])

  const KPI = [
    { label: 'Students',   value: data?.total_students,  icon: Users,      color: 'bg-info-bg text-ring',        link: '/admin/analytics' },
    { label: 'Courses',    value: data?.total_courses,   icon: BookOpen,   color: 'bg-success-bg text-success',  link: '/admin/courses' },
    { label: 'Resources',  value: data?.total_resources, icon: TrendingUp, color: 'bg-surface-raised text-muted', link: '/admin/upload' },
    { label: 'Downloads',  value: data?.total_downloads, icon: Download,   color: 'bg-warning-bg text-warning',  link: '/admin/analytics' },
  ]

  return (
    <AdminLayout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KPI.map(({ label, value, icon: Icon, color, link }) => (
          <Link key={label} to={link} className="card p-5 hover:shadow-card-md transition-shadow group">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-ink">{loading ? '—' : (value ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted mt-0.5 flex items-center justify-between">
              {label}
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Popular courses */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-4">Most Viewed Courses</h2>
            <Link to="/admin/analytics" className="text-xs text-ring hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-surface-raised rounded animate-pulse" />)}
            </div>
          ) : !data?.popular_courses?.length ? (
            <p className="text-sm text-muted">No course views recorded yet</p>
          ) : (
            <div className="space-y-3">
              {data.popular_courses.map((c, i) => (
                <div key={c.course_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-subtle w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink truncate">{c.title}</p>
                  </div>
                  <span className="text-xs font-semibold text-ring flex-shrink-0">{c.view_count} views</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top institutions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-4">Top Institutions</h2>
            <Link to="/admin/analytics" className="text-xs text-ring hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-surface-raised rounded animate-pulse" />)}
            </div>
          ) : !data?.top_institutions?.length ? (
            <p className="text-sm text-muted">No institution data yet. Students need to add their institution on registration.</p>
          ) : (
            <div className="space-y-3">
              {data.top_institutions.map((inst, i) => (
                <div key={inst.institution} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-subtle w-4">{i + 1}</span>
                  <p className="flex-1 text-sm text-ink truncate">{inst.institution}</p>
                  <span className="text-xs font-semibold text-success flex-shrink-0">{inst.student_count} students</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top downloads */}
        <div className="card p-5 md:col-span-2">
          <h2 className="heading-4 mb-4">Most Downloaded Resources</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface-raised rounded animate-pulse" />)}</div>
          ) : !data?.recent_downloads?.length ? (
            <p className="text-sm text-muted">No downloads yet</p>
          ) : (
            <table className="table-base">
              <thead><tr><th>Resource</th><th>Downloads</th></tr></thead>
              <tbody>
                {data.recent_downloads.map(r => (
                  <tr key={r.resource_id}>
                    <td>{r.title}</td>
                    <td><span className="font-semibold text-warning">{r.download_count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
