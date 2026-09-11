import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, EyeOff, Archive, Copy, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import { quizzesApi, coursesApi } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_VARIANT = { published: 'success', draft: 'neutral', archived: 'warning' }
const DIFF_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

export default function AdminQuizzes() {
  const [quizzes, setQuizzes]     = useState([])
  const [courses, setCourses]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', course_id: '', difficulty: 'beginner',
    max_attempts: 1, passing_score_pct: 60, time_limit_minutes: '',
    randomize_questions: false, randomize_answers: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([quizzesApi.list(), coursesApi.list({ limit: 50 })])
      .then(([q, c]) => { setQuizzes(q.data); setCourses(c.data.items) })
      .finally(() => setLoading(false))
  }, [])

  const set = k => e => setForm(f => ({
    ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
  }))

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        course_id: form.course_id || undefined,
        time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : undefined,
        max_attempts: parseInt(form.max_attempts),
        passing_score_pct: parseFloat(form.passing_score_pct),
      }
      const { data } = await quizzesApi.create(payload)
      setQuizzes(prev => [data, ...prev])
      setShowForm(false)
      setForm({ title: '', description: '', course_id: '', difficulty: 'beginner', max_attempts: 1, passing_score_pct: 60, time_limit_minutes: '', randomize_questions: false, randomize_answers: false })
      toast.success('Quiz created! Add questions to publish it.')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  async function handlePublish(quiz) {
    try {
      const { data } = await quizzesApi.publish(quiz.id)
      setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, status: data.status } : q))
      toast.success('Quiz published')
    } catch (err) { toast.error(err.response?.data?.detail || 'Cannot publish') }
  }

  async function handleUnpublish(quiz) {
    const { data } = await quizzesApi.unpublish(quiz.id)
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, status: data.status } : q))
    toast.success('Quiz set to draft')
  }

  async function handleArchive(quiz) {
    if (!window.confirm('Archive this quiz? Learners will no longer be able to attempt it.')) return
    const { data } = await quizzesApi.archive(quiz.id)
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, status: data.status } : q))
    toast.success('Quiz archived')
  }

  async function handleDuplicate(quiz) {
    try {
      const { data } = await quizzesApi.duplicate(quiz.id, {})
      setQuizzes(prev => [data, ...prev])
      toast.success(`"${data.title}" created as draft`)
    } catch { toast.error('Failed to duplicate') }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this quiz and all its attempts? This cannot be undone.')) return
    await quizzesApi.delete(id)
    setQuizzes(prev => prev.filter(q => q.id !== id))
    toast.success('Quiz deleted')
  }

  return (
    <AdminLayout title="Quiz Management">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Quiz</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="heading-4 mb-5">Create New Quiz</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={set('title')} required placeholder="e.g. GIS Fundamentals Assessment" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="Brief description of what this quiz covers" />
            </div>
            <div>
              <label className="label">Attach to Course</label>
              <select className="input" value={form.course_id} onChange={set('course_id')}>
                <option value="">None (standalone quiz)</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Max Attempts</label>
              <input className="input" type="number" min="1" max="10" value={form.max_attempts} onChange={set('max_attempts')} />
            </div>
            <div>
              <label className="label">Passing Score (%)</label>
              <input className="input" type="number" min="0" max="100" value={form.passing_score_pct} onChange={set('passing_score_pct')} />
            </div>
            <div>
              <label className="label">Time Limit (minutes) <span className="text-subtle font-normal normal-case">— leave blank for unlimited</span></label>
              <input className="input" type="number" min="1" value={form.time_limit_minutes} onChange={set('time_limit_minutes')} placeholder="e.g. 60" />
            </div>
            <div className="flex items-center gap-4 pt-4">
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-ring rounded" checked={form.randomize_questions} onChange={set('randomize_questions')} />
                Randomize question order
              </label>
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-ring rounded" checked={form.randomize_answers} onChange={set('randomize_answers')} />
                Randomize answer order
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2 border-t border-border">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Quiz'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-surface-raised rounded animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <p className="font-medium">No quizzes yet</p>
            <p className="text-sm mt-1">Click "New Quiz" to create your first assessment</p>
          </div>
        ) : (
          <table className="table-base">
            <thead><tr><th>Title</th><th>Course</th><th>Level</th><th>Questions</th><th>Pass %</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {quizzes.map(q => (
                <tr key={q.id}>
                  <td><p className="font-medium text-ink max-w-[200px] truncate">{q.title}</p></td>
                  <td className="text-muted text-xs">{courses.find(c => c.id === q.course_id)?.title || '—'}</td>
                  <td><Badge variant={DIFF_VARIANT[q.difficulty] || 'neutral'}>{q.difficulty}</Badge></td>
                  <td className="text-muted">{q.question_count}</td>
                  <td className="text-muted">{q.passing_score_pct}%</td>
                  <td><Badge variant={STATUS_VARIANT[q.status] || 'neutral'}>{q.status}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/admin/quizzes/${q.id}`} className="btn-ghost p-1.5 text-xs" title="Edit / add questions"><Pencil className="w-3.5 h-3.5" /></Link>
                      {q.status === 'published'
                        ? <button onClick={() => handleUnpublish(q)} className="btn-ghost p-1.5 text-xs" title="Unpublish"><EyeOff className="w-3.5 h-3.5" /></button>
                        : <button onClick={() => handlePublish(q)} className="btn-ghost p-1.5 text-xs text-success" title="Publish"><Eye className="w-3.5 h-3.5" /></button>
                      }
                      <button onClick={() => handleDuplicate(q)} className="btn-ghost p-1.5 text-xs" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                      {q.status !== 'archived' && (
                        <button onClick={() => handleArchive(q)} className="btn-ghost p-1.5 text-xs text-warning" title="Archive"><Archive className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => handleDelete(q.id)} className="btn-ghost p-1.5 text-xs text-danger hover:bg-danger-bg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
