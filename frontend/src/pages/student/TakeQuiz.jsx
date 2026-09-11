import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { attemptsApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function TakeQuiz() {
  const { quizId }   = useParams()
  const navigate     = useNavigate()

  const [step, setStep]         = useState('preview')  // preview | taking | submitted
  const [preview, setPreview]   = useState(null)
  const [attempt, setAttempt]   = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]   = useState({})         // { questionId: responseData }
  const [current, setCurrent]   = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    attemptsApi.preview(quizId)
      .then(({ data }) => setPreview(data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false))
  }, [quizId])

  // Countdown timer
  useEffect(() => {
    if (step !== 'taking' || !attempt || !preview?.time_limit_minutes) return
    const endTime = Date.now() + preview.time_limit_minutes * 60 * 1000
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) handleSubmit()
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [step, attempt])

  async function handleStart() {
    setLoading(true)
    try {
      const { data } = await attemptsApi.start(quizId)
      setAttempt(data)
      const qs = data.quiz?.questions || []
      setQuestions(qs)
      const initAnswers = {}
      qs.forEach(q => { initAnswers[q.id] = null })
      setAnswers(initAnswers)
      setCurrent(0)
      setStep('taking')
      if (preview.time_limit_minutes) setTimeLeft(preview.time_limit_minutes * 60)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start quiz')
    }
    setLoading(false)
  }

  const handleSubmit = useCallback(async () => {
    if (!attempt?.attempt_id) return
    clearInterval(timerRef.current)
    setSubmitting(true)
    try {
      const answerList = Object.entries(answers).map(([question_id, response_data]) => ({
        question_id, response_data
      }))
      const { data } = await attemptsApi.submit(attempt.attempt_id, { answers: answerList })
      setResult(data)
      setStep('submitted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    }
    setSubmitting(false)
  }, [attempt, answers])

  function setAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const answered = Object.values(answers).filter(v => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length
  const q = questions[current]

  // ── Preview screen ────────────────────────────────────────────────────────
  if (step === 'preview') {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-surface-raised rounded w-2/3" />
              <div className="h-4 bg-surface-raised rounded w-full" />
            </div>
          ) : preview && (
            <div className="card p-8">
              <h1 className="heading-2 mb-2">{preview.title}</h1>
              {preview.description && <p className="text-muted mb-6">{preview.description}</p>}

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Questions',     value: preview.questions?.length || 0 },
                  { label: 'Total Marks',   value: preview.total_marks },
                  { label: 'Passing Score', value: `${preview.passing_score_pct}%` },
                  { label: 'Time Limit',    value: preview.time_limit_minutes ? `${preview.time_limit_minutes} min` : 'Unlimited' },
                  { label: 'Max Attempts',  value: preview.max_attempts },
                  { label: 'Attempts Used', value: preview.attempts_used },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-raised rounded-lg px-4 py-3">
                    <p className="text-2xs text-subtle uppercase tracking-wider">{label}</p>
                    <p className="text-base font-bold text-ink mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {!preview.can_attempt ? (
                <div className="card p-4 bg-danger-bg border-danger/20 text-center mb-4">
                  <AlertTriangle className="w-5 h-5 text-danger mx-auto mb-1" />
                  <p className="text-sm font-medium text-danger">You have used all available attempts for this quiz.</p>
                </div>
              ) : (
                <div className="card p-4 bg-warning-bg border-warning/20 text-sm text-warning mb-4">
                  <p className="font-medium">Before you begin:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                    <li>You cannot pause once started.</li>
                    {preview.time_limit_minutes && <li>You have {preview.time_limit_minutes} minutes.</li>}
                    <li>Answer all questions before submitting.</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                {preview.can_attempt && (
                  <button onClick={handleStart} className="btn-primary flex-1 justify-center py-3 text-base" disabled={loading}>
                    {loading ? 'Starting…' : 'Start Quiz'}
                  </button>
                )}
                <Link to="/dashboard" className="btn-secondary">Back</Link>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    )
  }

  // ── Taking screen ─────────────────────────────────────────────────────────
  if (step === 'taking' && q) {
    return (
      <PageWrapper noFooter>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="text-sm text-muted">
              Question <span className="font-bold text-ink">{current + 1}</span> of {questions.length}
              &nbsp;·&nbsp;{answered} answered
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 text-sm font-mono font-bold px-3 py-1 rounded-lg ${timeLeft < 120 ? 'bg-danger-bg text-danger' : 'bg-surface-raised text-ink'}`}>
                <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-raised rounded-full h-1.5 mb-6">
            <div className="bg-ring h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          {/* Question card */}
          <div className="card p-6 mb-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <p className="text-base font-semibold text-ink leading-relaxed">{q.prompt}</p>
              <span className="badge badge-ring flex-shrink-0">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
            </div>
            <QuestionInput question={q} value={answers[q.id]} onChange={val => setAnswer(q.id, val)} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="btn-secondary"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex gap-1 overflow-x-auto py-1 max-w-xs">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-7 h-7 rounded-md text-xs font-bold flex-shrink-0 transition-colors ${
                    i === current ? 'bg-ring text-surface' :
                    answers[questions[i].id] !== null && answers[questions[i].id] !== '' ? 'bg-success-bg text-success' :
                    'bg-surface-raised text-muted'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {current < questions.length - 1 ? (
              <button onClick={() => setCurrent(c => c + 1)} className="btn-primary">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (answered < questions.length && !window.confirm(`You have ${questions.length - answered} unanswered question(s). Submit anyway?`)) return
                  handleSubmit()
                }}
                className="btn-primary bg-success hover:bg-success/90"
                disabled={submitting}
              >
                <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </PageWrapper>
    )
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (step === 'submitted' && result) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          {/* Score card */}
          <div className={`card p-8 text-center mb-8 ${result.passed ? 'bg-success-bg border-success/20' : result.passed === null ? 'bg-info-bg' : 'bg-danger-bg border-danger/20'}`}>
            <div className="text-5xl font-bold mb-2" style={{ color: result.passed ? '#1A8C5B' : result.passed === null ? '#297AA4' : '#C0392B' }}>
              {result.percentage.toFixed(1)}%
            </div>
            <p className="text-base font-semibold text-ink mt-1">
              {result.passed === null ? '⏳ Awaiting Manual Grading' : result.passed ? '✅ Passed!' : '❌ Not Passed'}
            </p>
            <p className="text-sm text-muted mt-2">
              {result.total_score} / {result.max_score} marks
              {result.time_taken_seconds && ` · ${Math.round(result.time_taken_seconds / 60)} min`}
            </p>
            {result.passed === null && (
              <p className="text-xs text-muted mt-3 max-w-md mx-auto">
                Some of your answers require manual review by an instructor. Your final result will be available once grading is complete.
              </p>
            )}
          </div>

          {/* Per-question breakdown */}
          <h2 className="heading-3 mb-4">Question Review</h2>
          <div className="space-y-3 mb-8">
            {result.items?.map((item, i) => (
              <div key={item.question_id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted mb-1">Q{i + 1}</p>
                    <p className="text-sm font-medium text-ink">{item.prompt}</p>
                    {item.your_answer !== null && item.your_answer !== undefined && (
                      <p className="text-xs text-muted mt-1">
                        Your answer: <span className="text-ink font-medium">{String(item.your_answer)}</span>
                      </p>
                    )}
                    {item.correct_answer !== null && item.correct_answer !== undefined && (
                      <p className="text-xs text-success mt-0.5">
                        Correct: <span className="font-medium">{String(item.correct_answer)}</span>
                      </p>
                    )}
                    {item.manual_feedback && (
                      <p className="text-xs text-muted mt-1 italic">Feedback: {item.manual_feedback}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {item.requires_manual_grading ? (
                      item.manual_marks_awarded !== null
                        ? <span className="text-sm font-bold text-ink">{item.manual_marks_awarded}/{item.marks}</span>
                        : <span className="badge badge-warning text-xs">Pending</span>
                    ) : (
                      <span className={`text-sm font-bold ${item.is_correct ? 'text-success' : 'text-danger'}`}>
                        {item.auto_marks_awarded}/{item.marks}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
            <Link to="/my-quizzes" className="btn-secondary">My Quiz History</Link>
          </div>
        </div>
      </PageWrapper>
    )
  }

  return null
}

// ── Question input components ─────────────────────────────────────────────────

function QuestionInput({ question, value, onChange }) {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {(question.options || []).map(opt => (
            <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${value === opt.id ? 'border-ring bg-ring-light' : 'border-border hover:bg-surface-raised'}`}>
              <input type="radio" name={`mc-${question.id}`} value={opt.id} checked={value === opt.id} onChange={() => onChange(opt.id)} className="w-4 h-4 accent-ring" />
              <span className="text-sm text-ink">{opt.text}</span>
            </label>
          ))}
        </div>
      )

    case 'multiple_select':
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted mb-3">Select all that apply</p>
          {(question.options || []).map(opt => {
            const selected = Array.isArray(value) && value.includes(opt.id)
            return (
              <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? 'border-ring bg-ring-light' : 'border-border hover:bg-surface-raised'}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const cur = Array.isArray(value) ? value : []
                    onChange(selected ? cur.filter(x => x !== opt.id) : [...cur, opt.id])
                  }}
                  className="w-4 h-4 accent-ring"
                />
                <span className="text-sm text-ink">{opt.text}</span>
              </label>
            )
          })}
        </div>
      )

    case 'true_false':
      return (
        <div className="flex gap-4">
          {[['true', true], ['false', false]].map(([label, val]) => (
            <label key={label} className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors font-medium ${String(value) === String(val) ? 'border-ring bg-ring-light text-ring' : 'border-border hover:bg-surface-raised text-muted'}`}>
              <input type="radio" className="sr-only" checked={String(value) === String(val)} onChange={() => onChange(val)} />
              {label === 'true' ? '✓ True' : '✗ False'}
            </label>
          ))}
        </div>
      )

    case 'fill_blank':
      return (
        <input
          className="input text-base"
          placeholder="Type your answer here…"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
        />
      )

    case 'matching':
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted">Match each item on the left to its pair on the right.</p>
          {(question.options?.left || []).map((leftItem, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-ink flex-1 bg-surface-raised px-3 py-2 rounded-lg">{leftItem}</span>
              <span className="text-muted">→</span>
              <select
                className="input flex-1"
                value={(value || {})[String(i)] || ''}
                onChange={e => onChange({ ...(value || {}), [String(i)]: e.target.value })}
              >
                <option value="">Select match…</option>
                {(question.options?.right || []).map((rightItem, j) => (
                  <option key={j} value={String(j)}>{rightItem}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )

    case 'short_answer':
      return <textarea className="input resize-none" rows={3} placeholder="Write your answer…" value={value || ''} onChange={e => onChange(e.target.value)} />

    case 'essay':
      return (
        <div>
          <textarea className="input resize-none" rows={8} placeholder="Write your essay response…" value={value || ''} onChange={e => onChange(e.target.value)} />
          <p className="text-xs text-muted mt-1">This question will be reviewed and graded by an instructor.</p>
        </div>
      )

    case 'python_code':
    case 'r_code': {
      const lang = question.type === 'python_code' ? 'Python' : 'R'
      return (
        <div>
          {question.options?.starter_code && (
            <div className="bg-ink rounded-lg p-3 mb-3 font-mono text-xs text-surface/80 overflow-auto">
              <p className="text-subtle text-2xs mb-1"># Starter code</p>
              <pre>{question.options.starter_code}</pre>
            </div>
          )}
          <textarea
            className="input resize-none font-mono text-sm"
            rows={10}
            placeholder={`# Write your ${lang} code here…`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">Your code will be reviewed by an instructor.</p>
        </div>
      )
    }

    case 'gis_workflow':
    case 'map_design':
      return (
        <div>
          {question.options?.instructions && (
            <div className="card bg-info-bg p-3 mb-3">
              <p className="text-sm text-ink">{question.options.instructions}</p>
            </div>
          )}
          <textarea className="input resize-none" rows={5} placeholder="Describe your workflow or approach…" value={value || ''} onChange={e => onChange(e.target.value)} />
          <p className="text-xs text-muted mt-1">You may also submit a file upload separately if required.</p>
        </div>
      )

    case 'file_upload':
      return (
        <div className="card border-dashed border-border p-6 text-center text-muted">
          <p className="text-sm font-medium">File upload</p>
          <p className="text-xs mt-1">Enter the URL of your submitted file, or note that you'll submit via email/LMS.</p>
          <input className="input mt-3 text-xs" placeholder="https://drive.google.com/…" value={value || ''} onChange={e => onChange(e.target.value)} />
        </div>
      )

    default:
      return <textarea className="input resize-none" rows={4} placeholder="Your response…" value={value || ''} onChange={e => onChange(e.target.value)} />
  }
}
