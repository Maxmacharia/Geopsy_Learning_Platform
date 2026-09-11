import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, ArrowLeft } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import { quizzesApi } from '../../services/api'
import toast from 'react-hot-toast'

const QUESTION_TYPES = [
  { value: 'multiple_choice',  label: 'Multiple Choice',           auto: true },
  { value: 'multiple_select',  label: 'Multiple Select',           auto: true },
  { value: 'true_false',       label: 'True / False',              auto: true },
  { value: 'fill_blank',       label: 'Fill in the Blank',         auto: true },
  { value: 'matching',         label: 'Matching',                  auto: true },
  { value: 'short_answer',     label: 'Short Answer',              auto: false },
  { value: 'essay',            label: 'Essay',                     auto: false },
  { value: 'gis_workflow',     label: 'GIS Workflow',              auto: false },
  { value: 'python_code',      label: 'Python Coding',            auto: false },
  { value: 'r_code',           label: 'R Coding',                  auto: false },
  { value: 'file_upload',      label: 'File Upload',              auto: false },
  { value: 'map_design',       label: 'Map Design Submission',    auto: false },
]

const BLANK_QUESTION = {
  type: 'multiple_choice', prompt: '', marks: 1, partial_credit: false,
  negative_marking: 0, grading_rubric: '', order_index: 0,
  // Multiple choice / select
  mc_options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
  mc_correct: '',
  ms_correct: [],
  // True/false
  tf_correct: true,
  // Fill blank
  fb_accepted: '',
  // Matching
  matching_left: ['', ''],
  matching_right: ['', ''],
  matching_pairs: { '0': '0', '1': '1' },
}

export default function AdminQuizEdit() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [questions, setQuestions] = useState([])
  const [addingType, setAddingType] = useState('')
  const [qForm, setQForm]       = useState({ ...BLANK_QUESTION })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    quizzesApi.get(quizId)
      .then(({ data }) => { setQuiz(data); setQuestions(data.questions || []) })
      .catch(() => navigate('/admin/quizzes'))
      .finally(() => setLoading(false))
  }, [quizId])

  function buildPayload() {
    const base = {
      type: qForm.type, prompt: qForm.prompt, marks: parseFloat(qForm.marks),
      partial_credit: qForm.partial_credit, negative_marking: parseFloat(qForm.negative_marking),
      grading_rubric: qForm.grading_rubric || undefined,
      order_index: questions.length,
    }
    switch (qForm.type) {
      case 'multiple_choice':
        return { ...base, options: qForm.mc_options, correct_answer: qForm.mc_correct }
      case 'multiple_select':
        return { ...base, options: qForm.mc_options, correct_answer: qForm.ms_correct }
      case 'true_false':
        return { ...base, correct_answer: qForm.tf_correct }
      case 'fill_blank':
        return { ...base, correct_answer: qForm.fb_accepted.split(',').map(s => s.trim()).filter(Boolean) }
      case 'matching': {
        const opts = { left: qForm.matching_left, right: qForm.matching_right }
        return { ...base, options: opts, correct_answer: qForm.matching_pairs }
      }
      default:
        return { ...base, options: qForm.grading_rubric ? { instructions: qForm.grading_rubric } : null }
    }
  }

  async function handleAddQuestion(e) {
    e.preventDefault()
    if (!qForm.prompt.trim()) { toast.error('Question prompt is required'); return }
    setSaving(true)
    try {
      const { data } = await quizzesApi.addQuestion(quizId, buildPayload())
      setQuestions(prev => [...prev, data])
      setQForm({ ...BLANK_QUESTION })
      setAddingType('')
      setQuiz(prev => ({ ...prev, total_marks: prev.total_marks + data.marks }))
      toast.success('Question added')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to add question') }
    setSaving(false)
  }

  async function handleDeleteQ(qId, marks) {
    if (!window.confirm('Delete this question?')) return
    await quizzesApi.deleteQuestion(qId)
    setQuestions(prev => prev.filter(q => q.id !== qId))
    setQuiz(prev => ({ ...prev, total_marks: Math.max(0, prev.total_marks - marks) }))
    toast.success('Question removed')
  }

  const setQ = k => e => setQForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function addMcOption() {
    const nextId = String.fromCharCode(97 + qForm.mc_options.length)
    setQForm(f => ({ ...f, mc_options: [...f.mc_options, { id: nextId, text: '' }] }))
  }

  function updateMcOption(idx, text) {
    setQForm(f => ({ ...f, mc_options: f.mc_options.map((o, i) => i === idx ? { ...o, text } : o) }))
  }

  function toggleMsCorrect(id) {
    setQForm(f => ({
      ...f,
      ms_correct: f.ms_correct.includes(id) ? f.ms_correct.filter(x => x !== id) : [...f.ms_correct, id]
    }))
  }

  if (loading) return <AdminLayout title="Quiz Editor"><div className="animate-pulse space-y-3"><div className="h-6 bg-surface-raised rounded w-1/2" /></div></AdminLayout>

  return (
    <AdminLayout title={quiz?.title || 'Quiz Editor'}>
      <div className="max-w-3xl space-y-6">
        {/* Quiz summary */}
        <div className="card p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={quiz?.status === 'published' ? 'success' : 'neutral'}>{quiz?.status}</Badge>
              <Badge variant="neutral">{quiz?.difficulty}</Badge>
              <span className="text-xs text-muted">Total marks: <strong className="text-ink">{quiz?.total_marks}</strong></span>
              <span className="text-xs text-muted">Pass: <strong className="text-ink">{quiz?.passing_score_pct}%</strong></span>
            </div>
            <p className="text-xs text-subtle mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => navigate('/admin/quizzes')} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Quizzes
          </button>
        </div>

        {/* Existing questions */}
        {questions.length > 0 && (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-2xs font-bold text-subtle">Q{i + 1}</span>
                      <Badge variant="neutral">{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</Badge>
                      <span className="text-xs text-muted">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      {q.requires_manual_grading && <Badge variant="warning">Manual grading</Badge>}
                    </div>
                    <p className="text-sm text-ink">{q.prompt}</p>
                  </div>
                  <button onClick={() => handleDeleteQ(q.id, q.marks)} className="btn-ghost p-1.5 text-danger hover:bg-danger-bg flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add question */}
        {addingType ? (
          <div className="card p-5">
            <h3 className="heading-4 mb-4 flex items-center justify-between">
              Add: {QUESTION_TYPES.find(t => t.value === addingType)?.label}
              <button onClick={() => setAddingType('')} className="btn-ghost text-xs p-1.5"><Trash2 className="w-3.5 h-3.5 text-danger" /></button>
            </h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="label">Question Prompt *</label>
                <textarea className="input resize-none" rows={3} value={qForm.prompt} onChange={setQ('prompt')} placeholder="Write your question here…" required autoFocus />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Marks</label>
                  <input className="input" type="number" step="0.5" min="0.5" value={qForm.marks} onChange={setQ('marks')} />
                </div>
                <div>
                  <label className="label">Negative marking</label>
                  <input className="input" type="number" step="0.5" min="0" value={qForm.negative_marking} onChange={setQ('negative_marking')} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-ring" checked={qForm.partial_credit} onChange={setQ('partial_credit')} />
                    Partial credit
                  </label>
                </div>
              </div>

              {/* Type-specific answer fields */}
              <QuestionAnswerFields qForm={qForm} setQ={setQ} setQForm={setQForm} addMcOption={addMcOption} updateMcOption={updateMcOption} toggleMsCorrect={toggleMsCorrect} />

              <div>
                <label className="label">{addingType.includes('_code') || addingType === 'essay' || addingType === 'gis_workflow' ? 'Grading Rubric (shown to admin graders)' : 'Grading Notes (optional)'}</label>
                <textarea className="input resize-none" rows={2} value={qForm.grading_rubric} onChange={setQ('grading_rubric')} placeholder={addingType === 'essay' ? 'What to look for in a good answer…' : ''} />
              </div>

              <div className="flex gap-3 pt-2 border-t border-border">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Plus className="w-4 h-4" /> {saving ? 'Saving…' : 'Add Question'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setAddingType('')}>Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card p-5">
            <h3 className="heading-4 mb-4">Add Question</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {QUESTION_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setAddingType(t.value); setQForm({ ...BLANK_QUESTION, type: t.value }) }}
                  className="card p-3 text-left hover:border-ring hover:shadow-card-md transition-all group border border-border"
                >
                  <p className="text-xs font-semibold text-ink group-hover:text-ring transition-colors leading-snug">{t.label}</p>
                  <p className="text-2xs text-subtle mt-0.5">{t.auto ? 'Auto-graded' : 'Manual grading'}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function QuestionAnswerFields({ qForm, setQ, setQForm, addMcOption, updateMcOption, toggleMsCorrect }) {
  switch (qForm.type) {
    case 'multiple_choice':
    case 'multiple_select':
      return (
        <div>
          <label className="label">Answer Options</label>
          <div className="space-y-2 mb-3">
            {qForm.mc_options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-subtle w-5">{opt.id.toUpperCase()}.</span>
                <input
                  className="input flex-1"
                  value={opt.text}
                  onChange={e => updateMcOption(i, e.target.value)}
                  placeholder={`Option ${opt.id.toUpperCase()}`}
                />
                {qForm.type === 'multiple_choice' && (
                  <input
                    type="radio" name="mc_correct" value={opt.id}
                    checked={qForm.mc_correct === opt.id}
                    onChange={e => setQForm(f => ({ ...f, mc_correct: e.target.value }))}
                    className="w-4 h-4 accent-ring"
                    title="Mark as correct answer"
                  />
                )}
                {qForm.type === 'multiple_select' && (
                  <input
                    type="checkbox"
                    checked={qForm.ms_correct.includes(opt.id)}
                    onChange={() => toggleMsCorrect(opt.id)}
                    className="w-4 h-4 accent-ring"
                    title="Mark as correct answer"
                  />
                )}
              </div>
            ))}
          </div>
          {qForm.mc_options.length < 6 && (
            <button type="button" onClick={addMcOption} className="btn-ghost text-xs text-ring">
              <Plus className="w-3 h-3" /> Add option
            </button>
          )}
          <p className="text-xs text-subtle mt-2">
            {qForm.type === 'multiple_choice' ? 'Select the radio button for the correct answer' : 'Tick all correct answers'}
          </p>
        </div>
      )

    case 'true_false':
      return (
        <div>
          <label className="label">Correct Answer</label>
          <div className="flex gap-4">
            {[true, false].map(val => (
              <label key={String(val)} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio" name="tf_correct"
                  checked={qForm.tf_correct === val}
                  onChange={() => setQForm(f => ({ ...f, tf_correct: val }))}
                  className="w-4 h-4 accent-ring"
                />
                {val ? 'True' : 'False'}
              </label>
            ))}
          </div>
        </div>
      )

    case 'fill_blank':
      return (
        <div>
          <label className="label">Accepted Answers <span className="text-subtle font-normal normal-case">(comma-separated, case-insensitive)</span></label>
          <input className="input" value={qForm.fb_accepted} onChange={setQ('fb_accepted')} placeholder="e.g. Geographic Information System, GIS" />
          <p className="text-xs text-subtle mt-1">Student's answer is checked against each option (trimmed, case-insensitive)</p>
        </div>
      )

    case 'matching':
      return (
        <div>
          <label className="label">Matching Pairs</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted mb-2">Left column</p>
              {qForm.matching_left.map((val, i) => (
                <input key={i} className="input mb-2" value={val} placeholder={`Item ${i + 1}`}
                  onChange={e => setQForm(f => ({ ...f, matching_left: f.matching_left.map((v, j) => j === i ? e.target.value : v) }))} />
              ))}
            </div>
            <div>
              <p className="text-xs text-muted mb-2">Right column (matches left by position)</p>
              {qForm.matching_right.map((val, i) => (
                <input key={i} className="input mb-2" value={val} placeholder={`Match ${i + 1}`}
                  onChange={e => setQForm(f => ({ ...f, matching_right: f.matching_right.map((v, j) => j === i ? e.target.value : v) }))} />
              ))}
            </div>
          </div>
          <button type="button" className="btn-ghost text-xs text-ring mt-1"
            onClick={() => setQForm(f => ({
              ...f,
              matching_left: [...f.matching_left, ''],
              matching_right: [...f.matching_right, ''],
              matching_pairs: { ...f.matching_pairs, [f.matching_left.length]: String(f.matching_right.length) }
            }))}>
            <Plus className="w-3 h-3" /> Add row
          </button>
        </div>
      )

    default:
      // Manual grading types — just show a note
      return (
        <div className="card p-4 bg-warning-bg border-warning/20">
          <p className="text-sm text-warning font-medium">Manual grading required</p>
          <p className="text-xs text-muted mt-1">
            This question type requires an admin to review and score each submission.
            Use the grading rubric field below to guide the grader.
          </p>
        </div>
      )
  }
}
