import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import { coursesApi } from '../../services/api'
import toast from 'react-hot-toast'

const DIFF_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

export default function AdminCourses() {
  const [courses, setCourses]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', difficulty: 'beginner', is_published: false })
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    // Fetch Courses
    coursesApi.list({ limit: 50 })
      .then((res) => {
        setCourses(res.data?.items || res.items || []);
      })
      .catch((err) => console.error("Failed to load admin courses:", err));

    // Fetch Categories
    coursesApi.categories()
      .then((res) => {
        const cleanData = res.data?.items || res.data || res;
        setCategories(Array.isArray(cleanData) ? cleanData : []);
      })
      .catch((err) => console.error("Failed to load admin categories:", err))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await coursesApi.create(form)
      setCourses(prev => [data, ...prev])
      setForm({ title: '', description: '', category: '', difficulty: 'beginner', is_published: false })
      setShowForm(false)
      toast.success('Course created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create course')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this course and all its content? This cannot be undone.')) return
    try {
      await coursesApi.delete(id)
      setCourses(prev => prev.filter(c => c.id !== id))
      toast.success('Course deleted')
    } catch { toast.error('Failed to delete') }
  }

  async function togglePublish(course) {
    try {
      const { data } = await coursesApi.update(course.id, { is_published: !course.is_published })
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_published: data.is_published } : c))
      toast.success(data.is_published ? 'Course published' : 'Course unpublished')
    } catch { toast.error('Failed to update') }
  }

  return (
    <AdminLayout title="Course Management">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted">{courses.length} total course{courses.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New Course</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-6 mb-6 border-ring/30">
          <h2 className="heading-4 mb-5">Create New Course</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label" htmlFor="c_title">Title *</label>
              <input id="c_title" className="input" value={form.title} onChange={set('title')} required placeholder="e.g. Introduction to QGIS" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="c_desc">Description</label>
              <textarea id="c_desc" className="input resize-none" rows={2} value={form.description} onChange={set('description')} placeholder="Brief description of the course" />
            </div>
            <div>
              <label className="label" htmlFor="c_cat">Category</label>
              <select id="c_cat" className="input" value={form.category} onChange={set('category')}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c_diff">Difficulty</label>
              <select id="c_diff" className="input" value={form.difficulty} onChange={set('difficulty')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="c_pub" checked={form.is_published} onChange={set('is_published')} className="w-4 h-4 accent-ring rounded" />
              <label htmlFor="c_pub" className="text-sm text-ink">Publish immediately (visible to students)</label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Course'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-surface-raised rounded animate-pulse" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="p-10 text-center text-muted">
            <p className="font-medium">No courses yet</p>
            <p className="text-sm mt-1">Click "New Course" to create your first course</p>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                {['Title', 'Category', 'Level', 'Modules', 'Status', 'Actions'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td>
                    <p className="font-medium text-ink max-w-xs truncate">{c.title}</p>
                  </td>
                  <td className="text-muted">{c.category || '—'}</td>
                  <td><Badge variant={DIFF_VARIANT[c.difficulty] || 'neutral'}>{c.difficulty}</Badge></td>
                  <td className="text-muted">{c.module_count}</td>
                  <td><Badge variant={c.is_published ? 'success' : 'neutral'}>{c.is_published ? 'Published' : 'Draft'}</Badge></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePublish(c)}
                        className="btn-ghost p-1.5 text-xs"
                        title={c.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {c.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <Link to={`/admin/courses/${c.id}`} className="btn-ghost p-1.5 text-xs" title="Edit course">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="btn-ghost p-1.5 text-xs text-danger hover:bg-danger-bg"
                        title="Delete course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
