import { useEffect, useState } from 'react'
import { BarChart2, Users, BookOpen, Download, TrendingUp } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { analyticsApi } from '../../services/api'

export default function AdminAnalytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.overview().then(({ data }) => setData(data)).finally(() => setLoading(false))
  }, [])

  const maxViews    = Math.max(...(data?.popular_courses?.map(c => c.view_count)    || [1]), 1)
  const maxStudents = Math.max(...(data?.top_institutions?.map(i => i.student_count) || [1]), 1)

  const KPI = [
    { label: 'Total Students',    value: data?.total_students,  icon: Users,      color: 'bg-info-bg text-ring' },
    { label: 'Published Courses', value: data?.total_courses,   icon: BookOpen,   color: 'bg-success-bg text-success' },
    { label: 'Resources',         value: data?.total_resources, icon: BarChart2,  color: 'bg-surface-raised text-muted' },
    { label: 'Downloads',         value: data?.total_downloads, icon: Download,   color: 'bg-warning-bg text-warning' },
  ]

  return (
    <AdminLayout title="Analytics">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KPI.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-ink">{loading ? '—' : (value ?? 0).toLocaleString()}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Course views bar chart */}
        <div className="card p-5">
          <h2 className="heading-4 mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ring" /> Course Views
          </h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 bg-surface-raised rounded animate-pulse" />)}</div>
          ) : !data?.popular_courses?.length ? (
            <p className="text-sm text-muted">No course views yet</p>
          ) : (
            <div className="space-y-4">
              {data.popular_courses.map(c => (
                <div key={c.course_id}>
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span className="truncate max-w-[200px] font-medium text-ink">{c.title}</span>
                    <span className="font-semibold text-ring ml-2 flex-shrink-0">{c.view_count}</span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-2">
                    <div
                      className="bg-ring h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(c.view_count / maxViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Institution breakdown */}
        <div className="card p-5">
          <h2 className="heading-4 mb-5 flex items-center gap-2">
            <Users className="w-4 h-4 text-success" /> Students by Institution
          </h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 bg-surface-raised rounded animate-pulse" />)}</div>
          ) : !data?.top_institutions?.length ? (
            <p className="text-sm text-muted">No institution data yet. Encourage students to add their institution during registration.</p>
          ) : (
            <div className="space-y-4">
              {data.top_institutions.map(inst => (
                <div key={inst.institution}>
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span className="truncate max-w-[200px] font-medium text-ink">{inst.institution}</span>
                    <span className="font-semibold text-success ml-2 flex-shrink-0">{inst.student_count}</span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(inst.student_count / maxStudents) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Downloads table */}
        <div className="card p-5 md:col-span-2">
          <h2 className="heading-4 mb-4 flex items-center gap-2">
            <Download className="w-4 h-4 text-warning" /> Resource Downloads
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface-raised rounded animate-pulse" />)}</div>
          ) : !data?.recent_downloads?.length ? (
            <p className="text-sm text-muted">No downloads recorded yet</p>
          ) : (
            <table className="table-base">
              <thead><tr><th>Resource</th><th>Downloads</th></tr></thead>
              <tbody>
                {data.recent_downloads.map(r => (
                  <tr key={r.resource_id}>
                    <td className="font-medium">{r.title}</td>
                    <td><span className="font-bold text-warning">{r.download_count}</span></td>
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
