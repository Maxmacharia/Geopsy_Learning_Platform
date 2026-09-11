import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, Clock, CheckCircle, XCircle, Download, ExternalLink } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import { attemptsApi, certificatesApi } from '../../services/api'

export default function MyQuizzes() {
  const [attempts, setAttempts]     = useState([])
  const [certs, setCerts]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('history')

  useEffect(() => {
    Promise.all([attemptsApi.myAttempts(), certificatesApi.mine()])
      .then(([a, c]) => { setAttempts(a.data); setCerts(c.data) })
      .finally(() => setLoading(false))
  }, [])

  const STATUS_META = {
    in_progress:             { label: 'In Progress',    variant: 'ring',    icon: Clock },
    submitted:               { label: 'Submitted',      variant: 'neutral', icon: Clock },
    awaiting_manual_grading: { label: 'Awaiting Grade', variant: 'warning', icon: Clock },
    auto_graded:             { label: 'Graded',         variant: 'success', icon: CheckCircle },
    graded:                  { label: 'Graded',         variant: 'success', icon: CheckCircle },
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="heading-1 mb-8">Assessments & Certificates</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface-raised p-1 rounded-xl w-fit">
          {[
            { key: 'history',      label: 'Quiz History' },
            { key: 'certificates', label: `Certificates (${certs.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === key ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* History tab */}
        {tab === 'history' && (
          loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface-raised" />)}</div>
          ) : attempts.length === 0 ? (
            <div className="card p-10 text-center text-muted">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No quiz attempts yet</p>
              <p className="text-sm mt-1">Complete a course to unlock quizzes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attempts.map(a => {
                const meta = STATUS_META[a.status] || { label: a.status, variant: 'neutral', icon: Clock }
                const Icon = meta.icon
                return (
                  <div key={a.id} className="card p-4 flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${a.passed ? 'bg-success-bg' : a.passed === false ? 'bg-danger-bg' : 'bg-surface-raised'}`}>
                      {a.passed
                        ? <CheckCircle className="w-4 h-4 text-success" />
                        : a.passed === false
                          ? <XCircle className="w-4 h-4 text-danger" />
                          : <Icon className="w-4 h-4 text-muted" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink">{a.quiz_title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        {a.percentage > 0 && <span className="text-xs text-muted">{a.percentage.toFixed(1)}%</span>}
                        <span className="text-xs text-subtle">Attempt #{a.attempt_number}</span>
                        <span className="text-xs text-subtle">{new Date(a.started_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {a.status === 'graded' && (
                      <Link to={`/quiz-attempts/${a.id}/result`} className="btn-ghost text-xs flex-shrink-0">
                        View Result
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Certificates tab */}
        {tab === 'certificates' && (
          loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface-raised" />)}</div>
          ) : certs.length === 0 ? (
            <div className="card p-10 text-center text-muted">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No certificates yet</p>
              <p className="text-sm mt-1">Complete and pass a graded quiz to earn a certificate</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {certs.map(cert => (
                <div key={cert.id} className="card p-6 flex flex-col">
                  {/* Certificate header */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="w-10 h-10 bg-info-bg rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-ring" />
                    </div>
                    <img src="/geopsy-logo.png" alt="GeoPsy" className="h-5 w-auto opacity-60" />
                  </div>

                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Certificate of Completion</p>
                  <h3 className="font-bold text-ink leading-snug mb-1">{cert.course_name}</h3>
                  {cert.competency_achieved && (
                    <p className="text-xs text-muted mb-1">{cert.competency_achieved}</p>
                  )}
                  {cert.certification_level && (
                    <Badge variant="ring" className="mb-3 w-fit">{cert.certification_level}</Badge>
                  )}
                  {cert.final_score_pct && (
                    <p className="text-xs text-muted">Score: <span className="text-success font-semibold">{cert.final_score_pct.toFixed(1)}%</span></p>
                  )}
                  <p className="text-xs text-subtle mt-1">
                    Issued: {new Date(cert.issued_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-2xs text-subtle mt-0.5 font-mono">{cert.certificate_number}</p>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    {cert.pdf_url && (
                      <a href={cert.pdf_url} target="_blank" rel="noreferrer" className="btn-primary text-xs flex-1 justify-center">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </a>
                    )}
                    <Link to={`/verify/${cert.verification_id}`} className="btn-secondary text-xs flex-shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" /> Verify
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </PageWrapper>
  )
}
