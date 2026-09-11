import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, BookOpen, Award, TrendingUp, CreditCard,
  GraduationCap, ClipboardList, Download, RefreshCw
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { analyticsApi } from '../../services/api'
import toast from 'react-hot-toast'

const BRAND   = '#297AA4'
const SUCCESS = '#1A8C5B'
const DANGER  = '#C0392B'
const WARNING = '#996A00'
const MUTED   = '#7E92A0'
const PIE_COLORS = [BRAND, SUCCESS, WARNING, DANGER, '#9B59B6', '#E67E22']

function KpiCard({ label, value, sub, icon: Icon, color='text-ring', bg='bg-info-bg' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-ink">{value ?? '—'}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

const TABS = [
  { key: 'overview',     label: 'Overview' },
  { key: 'courses',      label: 'Courses' },
  { key: 'students',     label: 'Students' },
  { key: 'institutions', label: 'Institutions' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'payments',     label: 'Payments' },
]

export default function AdminAnalytics() {
  const [tab, setTab]           = useState('overview')
  const [overview, setOverview] = useState(null)
  const [courses, setCourses]   = useState([])
  const [students, setStudents] = useState({ items: [], total: 0 })
  const [instData, setInstData] = useState([])
  const [certData, setCertData] = useState(null)
  const [payData,  setPayData]  = useState(null)
  const [trends,   setTrends]   = useState([])
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState({})
  const [search,   setSearch]   = useState('')
  const [selStudent, setSelStudent] = useState(null)
  const [detail,   setDetail]   = useState(null)
  const [quizHist, setQuizHist] = useState(null)

  async function load(key) {
    if (loading[key]) return
    setLoading(p => ({ ...p, [key]: true }))
    try {
      if (key === 'overview') {
        const [ov, tr, ac] = await Promise.all([analyticsApi.overview(), analyticsApi.trends(), analyticsApi.recentActivity()])
        setOverview(ov.data); setTrends(tr.data); setActivity(ac.data)
      } else if (key === 'courses') {
        setCourses((await analyticsApi.courses()).data)
      } else if (key === 'students') {
        setStudents((await analyticsApi.students({ limit: 60 })).data)
      } else if (key === 'institutions') {
        setInstData((await analyticsApi.institutions()).data)
      } else if (key === 'certificates') {
        setCertData((await analyticsApi.certificates()).data)
      } else if (key === 'payments') {
        setPayData((await analyticsApi.payments()).data)
      }
    } catch { toast.error(`Failed to load ${key}`) }
    setLoading(p => ({ ...p, [key]: false }))
  }

  useEffect(() => { load('overview') }, [])
  useEffect(() => { load(tab) }, [tab])

  async function selectStudent(s) {
    setSelStudent(s); setDetail(null); setQuizHist(null)
    try {
      const [d, q] = await Promise.all([analyticsApi.studentDetail(s.id), analyticsApi.quizHistory(s.id)])
      setDetail(d.data); setQuizHist(q.data)
    } catch { toast.error('Could not load student details') }
  }

  const filtered = (students.items || []).filter(s =>
    !search || [s.full_name, s.email, s.institution || ''].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AdminLayout title="Platform Analytics">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap bg-surface-raised p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && overview && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Students"   value={overview.students.total}             sub={`+${overview.students.new_this_week} this week`} icon={Users}         color="text-ring"    bg="bg-info-bg" />
            <KpiCard label="Active (30d)"     value={overview.students.active_30d}        sub={`${overview.students.inactive} inactive`}        icon={TrendingUp}    color="text-success" bg="bg-success-bg" />
            <KpiCard label="Enrollments"      value={overview.enrollments.active}         sub={`${overview.enrollments.total} total`}           icon={BookOpen}      color="text-warning" bg="bg-warning-bg" />
            <KpiCard label="Completions"      value={overview.enrollments.completed}      sub={`${overview.enrollments.completion_rate}% rate`} icon={GraduationCap} color="text-ring"    bg="bg-info-bg" />
            <KpiCard label="Certificates"     value={overview.certificates.total_issued}                                                        icon={Award}         color="text-success" bg="bg-success-bg" />
            <KpiCard label="Revenue (KES)"    value={`${(overview.revenue.total_kes||0).toLocaleString()}`} sub={`${(overview.revenue.this_month_kes||0).toLocaleString()} this month`} icon={CreditCard} color="text-ring" bg="bg-info-bg" />
            <KpiCard label="Quiz Attempts"    value={overview.quizzes.total_attempts}     sub={`Avg ${overview.quizzes.average_score_pct}%`}    icon={ClipboardList} color="text-muted"   bg="bg-surface-raised" />
            <KpiCard label="Downloads"        value={overview.engagement.total_downloads}                                                       icon={Download}      color="text-muted"   bg="bg-surface-raised" />
          </div>

          {trends.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Weekly Trends (8 Weeks)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B9C6D0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: MUTED }} />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="new_students"    stroke={BRAND}   strokeWidth={2} dot={false} name="New Students" />
                  <Line type="monotone" dataKey="new_enrollments" stroke={SUCCESS} strokeWidth={2} dot={false} name="Enrollments" />
                  <Line type="monotone" dataKey="quiz_attempts"   stroke={WARNING} strokeWidth={2} dot={false} name="Quiz Attempts" />
                  <Line type="monotone" dataKey="completions"     stroke={DANGER}  strokeWidth={2} dot={false} name="Completions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activity.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-raised border-b border-border">
                <h3 className="text-sm font-semibold text-ink">Recent Platform Activity</h3>
              </div>
              <div className="divide-y divide-border">
                {activity.slice(0, 12).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === 'passed' || item.status === 'success' || item.status === 'issued' ? 'bg-success' : item.status === 'failed' ? 'bg-danger' : 'bg-ring'}`} />
                    <p className="text-sm text-ink flex-1">{item.message}</p>
                    <p className="text-2xs text-subtle">{new Date(item.ts).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COURSES */}
      {tab === 'courses' && (
        <div className="space-y-6">
          {courses.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Enrollments vs Completions</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={courses.slice(0,8)} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B9C6D0" />
                  <XAxis dataKey="title" tick={{ fontSize: 10, fill: MUTED }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total_enrollments" fill={BRAND}   name="Enrolled"   radius={[3,3,0,0]} />
                  <Bar dataKey="completions"        fill={SUCCESS} name="Completed"  radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>Course</th><th>Level</th><th>Price</th><th>Enrolled</th><th>Completed</th><th>Failed</th><th>Rate</th><th>Avg Score</th></tr></thead>
              <tbody>
                {courses.map(c => (
                  <tr key={c.id}>
                    <td><p className="font-medium text-ink max-w-[160px] truncate">{c.title}</p></td>
                    <td><span className="badge badge-neutral capitalize">{c.difficulty}</span></td>
                    <td className="text-muted text-xs">{c.price_kes > 0 ? `KES ${c.price_kes.toLocaleString()}` : 'Free'}</td>
                    <td>{c.total_enrollments}</td>
                    <td className="text-success">{c.completions}</td>
                    <td className="text-danger">{c.failures}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <div className="w-12 bg-surface-raised rounded-full h-1.5">
                          <div className="bg-success h-1.5 rounded-full" style={{ width: `${c.completion_rate}%` }} />
                        </div>
                        <span className="text-xs text-muted">{c.completion_rate}%</span>
                      </div>
                    </td>
                    <td className="text-muted">{c.avg_quiz_score ? `${c.avg_quiz_score}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENTS */}
      {tab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="heading-3 flex-1">Students ({students.total})</h2>
              <button onClick={() => load('students')} className="btn-ghost p-1.5"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <input className="input mb-3 text-sm" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="space-y-1.5 max-h-[62vh] overflow-y-auto scrollbar-thin pr-1">
              {filtered.map(s => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className={`w-full card p-3 text-left transition-all ${selStudent?.id === s.id ? 'border-ring' : 'hover:shadow-card'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ring-light text-ring text-xs font-bold flex items-center justify-center flex-shrink-0">{s.full_name[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{s.full_name}</p>
                      <p className="text-2xs text-muted truncate">{s.institution || s.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0 text-2xs text-subtle">
                      {s.courses_completed} done
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            {!selStudent ? (
              <div className="card p-8 text-center text-muted"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Select a student</p></div>
            ) : !detail ? (
              <div className="card p-8 animate-pulse space-y-3"><div className="h-6 bg-surface-raised rounded w-1/2" /><div className="h-4 bg-surface-raised rounded" /></div>
            ) : (
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-12 h-12 rounded-full bg-ring-light text-ring text-lg font-bold flex items-center justify-center">{detail.full_name[0].toUpperCase()}</div>
                  <div>
                    <h3 className="font-bold text-ink">{detail.full_name}</h3>
                    <p className="text-xs text-muted">{detail.email}</p>
                    <p className="text-xs text-subtle">{detail.institution}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Downloads', detail.total_downloads], ['Certs', detail.certificates?.length], ['Courses', detail.enrollments?.length]].map(([l,v]) => (
                    <div key={l} className="bg-surface-raised rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-ink">{v ?? 0}</p>
                      <p className="text-2xs text-muted">{l}</p>
                    </div>
                  ))}
                </div>
                {detail.enrollments?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Courses</p>
                    <div className="space-y-1.5">
                      {detail.enrollments.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-sm px-2 py-1.5 bg-surface-raised rounded-lg">
                          <p className="truncate text-ink flex-1 mr-2 text-xs">{e.course_title}</p>
                          <span className={`text-2xs font-semibold capitalize ${e.status === 'passed' || e.status === 'completed' ? 'text-success' : e.status === 'failed' ? 'text-danger' : 'text-ring'}`}>{e.status.replace(/_/g,' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {quizHist?.attempts?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Recent Quizzes</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                      {quizHist.attempts.slice(0, 6).map(a => (
                        <div key={a.attempt_id} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-surface-raised rounded-lg">
                          <p className="truncate flex-1 text-ink">{a.quiz_title}</p>
                          <span className={`font-semibold ${a.passed ? 'text-success' : a.passed === false ? 'text-danger' : 'text-muted'}`}>{a.percentage?.toFixed(0)}%</span>
                          <span className="text-subtle">{new Date(a.started_at).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detail.certificates?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Certificates</p>
                    {detail.certificates.map(c => (
                      <div key={c.certificate_number} className="flex items-center gap-2 px-2 py-1.5 bg-success-bg rounded-lg mb-1.5">
                        <Award className="w-3.5 h-3.5 text-success" /><p className="text-xs text-ink flex-1 truncate">{c.course_name}</p><span className="text-xs font-semibold text-success">{c.final_score_pct?.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INSTITUTIONS */}
      {tab === 'institutions' && (
        <div className="space-y-6">
          {instData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Learners by Institution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={instData.slice(0,8)} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#B9C6D0" />
                  <XAxis dataKey="institution" tick={{ fontSize: 9, fill: MUTED }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total_learners" fill={BRAND}   name="Learners"    radius={[3,3,0,0]} />
                  <Bar dataKey="completions"    fill={SUCCESS} name="Completions" radius={[3,3,0,0]} />
                  <Bar dataKey="certificates_earned" fill={WARNING} name="Certs" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>Institution</th><th>Learners</th><th>Active</th><th>Enrolled</th><th>Completed</th><th>Rate</th><th>Avg Score</th><th>Certs</th></tr></thead>
              <tbody>
                {instData.map(i => (
                  <tr key={i.institution}>
                    <td><p className="font-medium text-ink max-w-[180px] truncate text-xs">{i.institution}</p></td>
                    <td>{i.total_learners}</td><td>{i.active_learners_30d}</td><td>{i.total_enrollments}</td>
                    <td className="text-success">{i.completions}</td>
                    <td>{i.completion_rate}%</td>
                    <td>{i.avg_quiz_score ? `${i.avg_quiz_score}%` : '—'}</td>
                    <td><span className="badge badge-success">{i.certificates_earned}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CERTIFICATES */}
      {tab === 'certificates' && certData && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Total Issued"  value={certData.total_issued}      icon={Award} color="text-success" bg="bg-success-bg" />
            <KpiCard label="This Month"    value={certData.issued_this_month} icon={TrendingUp} color="text-ring" bg="bg-info-bg" />
            <KpiCard label="Revoked"       value={certData.revoked}           icon={Award} color="text-danger"  bg="bg-danger-bg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certData.by_course?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-ink mb-3">By Course</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={certData.by_course} dataKey="count" nameKey="course" cx="50%" cy="50%" outerRadius={70} label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {certData.by_course.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Recent Issues</h3>
              <div className="space-y-2">
                {certData.recent?.slice(0,6).map(c => (
                  <div key={c.certificate_number} className="flex items-center gap-2 text-xs">
                    <Award className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    <span className="flex-1 truncate text-ink">{c.learner_name}</span>
                    <span className="text-muted">{c.final_score_pct?.toFixed(0)}%</span>
                    <span className="text-subtle">{new Date(c.issued_at).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {tab === 'payments' && payData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Total Revenue (KES)"   value={(payData.total_revenue_all_time_kes||0).toLocaleString()} icon={CreditCard} color="text-ring" bg="bg-info-bg" />
            <KpiCard label={`Revenue (${payData.period_days}d)`} value={(payData.revenue_last_n_days_kes||0).toLocaleString()} icon={TrendingUp} color="text-success" bg="bg-success-bg" />
          </div>
          {payData.by_status?.length > 0 && (
            <div className="card p-4 flex flex-wrap gap-3">
              {payData.by_status.map(s => (
                <div key={s.status} className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${s.status === 'success' ? 'bg-success' : s.status === 'failed' ? 'bg-danger' : 'bg-warning'}`} />
                  <span className="text-sm text-ink capitalize">{s.status}</span>
                  <span className="text-xs text-muted">({s.count})</span>
                </div>
              ))}
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-raised border-b border-border">
              <h3 className="text-sm font-semibold text-ink">Successful Transactions</h3>
            </div>
            <table className="table-base">
              <thead><tr><th>Receipt</th><th>Phone</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {(payData.recent_transactions||[]).filter(t => t.status === 'success').slice(0,15).map(t => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.mpesa_receipt_number||'—'}</td>
                    <td className="text-muted">{t.phone_number}</td>
                    <td className="font-semibold">KES {t.amount.toLocaleString()}</td>
                    <td className="text-muted">{t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
