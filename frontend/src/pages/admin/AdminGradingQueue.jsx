import { useState, useEffect } from 'react'
import { CheckCircle, Clock, FileText, Code, Map, Send } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { gradingApi } from '../../services/api'
import toast from 'react-hot-toast'

const TYPE_ICONS = { essay: FileText, short_answer: FileText, python_code: Code, r_code: Code, gis_workflow: Map, map_design: Map, file_upload: FileText }

export default function AdminGradingQueue() {
  const [queue, setQueue]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [active, setActive]       = useState(null)
  const [marks, setMarks]         = useState('')
  const [feedback, setFeedback]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    gradingApi.queue().then(({ data }) => setQueue(data)).finally(() => setLoading(false))
  }, [])

  function openItem(item) {
    setActive(item)
    setMarks('')
    setFeedback('')
  }

  async function handleGrade(e) {
    e.preventDefault()
    const marksNum = parseFloat(marks)
    if (isNaN(marksNum) || marksNum < 0) { toast.error('Enter a valid mark'); return }
    if (marksNum > active.max_marks) { toast.error(`Cannot exceed ${active.max_marks} marks`); return }
    setSubmitting(true)
    try {
      await gradingApi.gradeResponse(active.response_id, { marks_awarded: marksNum, feedback: feedback || undefined })
      setQueue(prev => prev.filter(item => item.response_id !== active.response_id))
      setActive(null)
      toast.success('Grade submitted')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to submit grade') }
    setSubmitting(false)
  }

  return (
    <AdminLayout title="Grading Queue">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-4">Pending Reviews</h2>
            <span className="badge badge-warning">{queue.length} pending</span>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface-raised" />)}</div>
          ) : queue.length === 0 ? (
            <div className="card p-10 text-center text-muted">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success opacity-60" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No responses awaiting manual grading</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map(item => {
                const Icon = TYPE_ICONS[item.question_type] || FileText
                const isActive = active?.response_id === item.response_id
                return (
                  <button
                    key={item.response_id}
                    onClick={() => openItem(item)}
                    className={`w-full card p-4 text-left transition-all ${isActive ? 'border-ring shadow-card-md' : 'hover:shadow-card-md'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-info-bg rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-ring" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{item.quiz_title}</p>
                        <p className="text-xs text-muted truncate">{item.learner_name}</p>
                        <p className="text-xs text-subtle mt-0.5 truncate">{item.question_prompt}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-ring">/{item.max_marks}</p>
                        <p className="text-2xs text-subtle">marks</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Grading panel */}
        <div>
          {!active ? (
            <div className="card p-8 text-center text-muted h-full flex flex-col items-center justify-center">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Select a submission to grade</p>
            </div>
          ) : (
            <div className="card p-5 sticky top-20">
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs text-muted mb-0.5">{active.quiz_title}</p>
                <h3 className="heading-4">{active.learner_name}</h3>
                <p className="text-xs text-subtle mt-0.5">Submitted {new Date(active.submitted_at).toLocaleString()}</p>
              </div>

              <div className="mb-4">
                <label className="label">Question</label>
                <p className="text-sm text-ink leading-relaxed">{active.question_prompt}</p>
              </div>

              <div className="mb-4">
                <label className="label">Learner's Response</label>
                {active.file_url ? (
                  <a href={active.file_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs inline-flex">
                    View Submission File
                  </a>
                ) : (
                  <div className="card bg-surface-raised p-3 text-sm text-ink whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
                    {typeof active.response_data === 'string'
                      ? active.response_data
                      : JSON.stringify(active.response_data, null, 2)}
                  </div>
                )}
              </div>

              <form onSubmit={handleGrade} className="space-y-3">
                <div>
                  <label className="label">Marks Awarded (max {active.max_marks})</label>
                  <input
                    className="input"
                    type="number"
                    step="0.5"
                    min="0"
                    max={active.max_marks}
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                    required
                    autoFocus
                    placeholder={`0 – ${active.max_marks}`}
                  />
                </div>
                <div>
                  <label className="label">Feedback to Learner <span className="text-subtle font-normal normal-case">(optional)</span></label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Explain your grade, highlight strengths or areas to improve…"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1 justify-center" disabled={submitting}>
                    <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Grade'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setActive(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
