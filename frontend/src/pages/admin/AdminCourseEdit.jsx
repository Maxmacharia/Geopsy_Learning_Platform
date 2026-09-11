import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  Save, ArrowLeft, Eye, EyeOff, GripVertical, X, Check
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import RichTextEditor from '../../components/editor/RichTextEditor'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { coursesApi, quizzesApi, extCoursesApi } from '../../services/api'
import toast from 'react-hot-toast'
// Use extended CRUD endpoints for this page
const coursesCrud = {
  list:           coursesApi.list,
  getById:        extCoursesApi.getById,
  update:         extCoursesApi.update,
  addModule:      (courseId, data) => coursesCrud.addModule ? coursesCrud.addModule(courseId, data) : extCoursesApi.update(courseId, data),
  updateModule:   extCoursesApi.updateModule,
  deleteModule:   extCoursesApi.deleteModule,
  reorderModules: extCoursesApi.reorderModules,
  addLesson:      extCoursesApi.addLesson,
  updateLesson:   extCoursesApi.updateLesson,
  deleteLesson:   extCoursesApi.deleteLesson,
  reorderLessons: extCoursesApi.reorderLessons,
}

// ── Inline confirm dialog ─────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = true }) {
  if (!open) return null
  return (
    <Modal onClose={onCancel}>
      <div className="p-6 max-w-sm">
        <h3 className="heading-3 mb-2">{title}</h3>
        <p className="text-sm text-muted mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className={danger ? 'btn-danger flex-1 justify-center' : 'btn-primary flex-1 justify-center'}>
            Confirm
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Course-level edit panel ────────────────────────────────────────────────────
function CourseEditPanel({ course, onSave }) {
  const [form, setForm] = useState({
    title: course.title || '',
    description: course.description || '',
    difficulty: course.difficulty || 'beginner',
    is_published: course.is_published || false,
    price: course.price || 0,
    order_index: course.order_index || 0,
    prerequisite_id: course.prerequisite_id || '',
    max_retakes: course.max_retakes ?? 3,
  })
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    coursesApi.list({ limit: 100 }).then(({ data }) => setCourses(data.items || []))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price) || 0,
        order_index: parseInt(form.order_index) || 0,
        max_retakes: parseInt(form.max_retakes) || 3,
        prerequisite_id: form.prerequisite_id || null,
      }
      await coursesCrud.update(course.id, payload)
      toast.success('Course updated')
      onSave(payload)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="card p-5 mb-6">
      <h2 className="heading-4 mb-4">Course Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Course Title *</label>
          <input className="input" value={form.title} onChange={set('title')} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} minHeight={150} />
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
          <label className="label">Price (KES) — 0 = free</label>
          <input className="input" type="number" min="0" step="50" value={form.price} onChange={set('price')} />
        </div>
        <div>
          <label className="label">Progression Order</label>
          <input className="input" type="number" min="0" value={form.order_index} onChange={set('order_index')} />
        </div>
        <div>
          <label className="label">Max Retakes (0 = unlimited)</label>
          <input className="input" type="number" min="0" max="10" value={form.max_retakes} onChange={set('max_retakes')} />
        </div>
        <div>
          <label className="label">Prerequisite Course</label>
          <select className="input" value={form.prerequisite_id} onChange={set('prerequisite_id')}>
            <option value="">None — open to all</option>
            {courses.filter(c => c.id !== course.id).map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-ring" checked={form.is_published} onChange={set('is_published')} />
            <span className="font-medium text-ink">Published (visible to learners)</span>
          </label>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Course'}
        </button>
      </div>
    </div>
  )
}

// ── Lesson edit form ──────────────────────────────────────────────────────────
function LessonForm({ lesson, moduleId, onSave, onCancel }) {
  const isNew = !lesson?.id
  const [form, setForm] = useState({
    title: lesson?.title || '',
    content_preview: lesson?.content_preview || '',
    content: lesson?.content || '',
    is_gated: lesson?.is_gated ?? true,
    order_index: lesson?.order_index ?? 0,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const { data } = await coursesCrud.addLesson(moduleId, form)
        toast.success('Lesson created')
        onSave(data)
      } else {
        const { data } = await coursesCrud.updateLesson(lesson.id, form)
        toast.success('Lesson updated')
        onSave(data)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="card p-5 space-y-4 mb-4">
      <div>
        <label className="label">Lesson Title *</label>
        <input className="input" value={form.title} onChange={set('title')} autoFocus />
      </div>
      <div>
        <label className="label">Content Preview <span className="text-subtle font-normal normal-case">(shown to non-enrolled learners)</span></label>
        <RichTextEditor value={form.content_preview} onChange={v => setForm(f => ({ ...f, content_preview: v }))} minHeight={100} placeholder="Hook text shown before login…" />
      </div>
      <div>
        <label className="label">Full Lesson Content <span className="text-subtle font-normal normal-case">(enrolled learners only)</span></label>
        <RichTextEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} minHeight={300} placeholder="Full lesson notes, exercises, and activities…" />
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-ring" checked={form.is_gated} onChange={set('is_gated')} />
          <span className="font-medium">Require enrollment to access full content</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="label mb-0">Order:</label>
          <input className="input w-20" type="number" min="0" value={form.order_index} onChange={set('order_index')} />
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t border-border">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : isNew ? 'Create Lesson' : 'Save Lesson'}
        </button>
        <button onClick={onCancel} className="btn-secondary"><X className="w-4 h-4" /> Cancel</button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminCourseEdit() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [editingModule, setEditingModule] = useState(null)   // module id
  const [editModuleForm, setEditModuleForm] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)   // { type, id, label }
  const [addingLesson, setAddingLesson] = useState(null)     // module id
  const [editingLesson, setEditingLesson] = useState(null)   // lesson object

  useEffect(() => {
    coursesCrud.getById(courseId)
      .then(({ data }) => {
        setCourse(data)
        setModules(data.modules?.sort((a, b) => a.order_index - b.order_index) || [])
      })
      .catch(() => navigate('/admin/courses'))
      .finally(() => setLoading(false))
  }, [courseId])

  // ── Module ops ──────────────────────────────────────────────────────────────

  async function handleAddModule(e) {
    e.preventDefault()
    if (!newModuleTitle.trim()) return
    try {
      const { data } = await coursesCrud.addModule(courseId, {
        title: newModuleTitle.trim(),
        description: '',
        order_index: modules.length,
      })
      setModules(prev => [...prev, { ...data, lessons: [] }])
      setNewModuleTitle('')
      setAddingModule(false)
      toast.success('Module created')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  async function handleSaveModule(moduleId) {
    try {
      await coursesCrud.updateModule(moduleId, editModuleForm)
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, ...editModuleForm } : m))
      setEditingModule(null)
      toast.success('Module updated')
    } catch { toast.error('Update failed') }
  }

  async function handleDeleteModule(moduleId) {
    try {
      await coursesCrud.deleteModule(moduleId)
      setModules(prev => prev.filter(m => m.id !== moduleId))
      toast.success('Module deleted')
    } catch { toast.error('Delete failed') }
    setConfirmDelete(null)
  }

  async function moveModule(idx, dir) {
    const newOrder = [...modules]
    const swap = idx + dir
    if (swap < 0 || swap >= newOrder.length) return
    ;[newOrder[idx], newOrder[swap]] = [newOrder[swap], newOrder[idx]]
    setModules(newOrder)
    const ordered_ids = newOrder.map(m => m.id)
    try {
      await coursesCrud.reorderModules(courseId, ordered_ids)
    } catch { toast.error('Reorder failed') }
  }

  // ── Lesson ops ───────────────────────────────────────────────────────────────

  function handleLessonSaved(moduleId, lessonData) {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      const existing = m.lessons?.find(l => l.id === lessonData.id)
      if (existing) {
        return { ...m, lessons: m.lessons.map(l => l.id === lessonData.id ? lessonData : l) }
      }
      return { ...m, lessons: [...(m.lessons || []), lessonData] }
    }))
    setAddingLesson(null)
    setEditingLesson(null)
  }

  async function handleDeleteLesson(moduleId, lessonId, title) {
    try {
      await coursesCrud.deleteLesson(lessonId)
      setModules(prev => prev.map(m => m.id !== moduleId ? m : {
        ...m, lessons: m.lessons.filter(l => l.id !== lessonId)
      }))
      toast.success(`Lesson "${title}" deleted`)
    } catch { toast.error('Delete failed') }
    setConfirmDelete(null)
  }

  async function moveLesson(moduleId, idx, dir) {
    const module = modules.find(m => m.id === moduleId)
    if (!module) return
    const lessons = [...(module.lessons || [])].sort((a, b) => a.order_index - b.order_index)
    const swap = idx + dir
    if (swap < 0 || swap >= lessons.length) return
    ;[lessons[idx], lessons[swap]] = [lessons[swap], lessons[idx]]
    setModules(prev => prev.map(m => m.id !== moduleId ? m : { ...m, lessons }))
    try {
      await coursesCrud.reorderLessons(moduleId, lessons.map(l => l.id))
    } catch { toast.error('Reorder failed') }
  }

  if (loading) return <AdminLayout title="Course Editor"><div className="animate-pulse space-y-3"><div className="h-8 bg-surface-raised rounded w-1/2" /></div></AdminLayout>
  if (!course) return null

  return (
    <AdminLayout title={`Edit: ${course.title}`}>
      <div className="max-w-4xl">
        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/courses" className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" /> All Courses
          </Link>
          <div className="flex gap-2">
            <Badge variant={course.is_published ? 'success' : 'neutral'}>
              {course.is_published ? 'Published' : 'Draft'}
            </Badge>
            <Badge variant="neutral">{course.difficulty}</Badge>
            {course.price > 0 && <Badge variant="ring">KES {course.price.toLocaleString()}</Badge>}
          </div>
        </div>

        {/* Course settings */}
        <CourseEditPanel
          course={course}
          onSave={updates => setCourse(prev => ({ ...prev, ...updates }))}
        />

        {/* Modules & Lessons */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-3">Modules &amp; Lessons</h2>
          <button onClick={() => setAddingModule(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>

        {/* Add module form */}
        {addingModule && (
          <form onSubmit={handleAddModule} className="card p-4 mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Module Title</label>
              <input className="input" autoFocus value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="e.g. GIS Foundations" />
            </div>
            <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add</button>
            <button type="button" className="btn-secondary" onClick={() => setAddingModule(false)}><X className="w-4 h-4" /></button>
          </form>
        )}

        {/* Module list */}
        {modules.length === 0 ? (
          <div className="card p-8 text-center text-muted">
            <p>No modules yet. Add your first module to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module, mi) => {
              const sortedLessons = [...(module.lessons || [])].sort((a, b) => a.order_index - b.order_index)
              return (
                <div key={module.id} className="card overflow-hidden">
                  {/* Module header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised border-b border-border">
                    <GripVertical className="w-4 h-4 text-subtle flex-shrink-0" />
                    {editingModule === module.id ? (
                      <div className="flex-1 flex gap-2">
                        <input className="input flex-1 py-1 text-sm" value={editModuleForm.title || ''} onChange={e => setEditModuleForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                        <button onClick={() => handleSaveModule(module.id)} className="btn-primary text-xs py-1"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingModule(null)} className="btn-secondary text-xs py-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <span className="font-semibold text-sm text-ink flex-1">{module.title}</span>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => moveModule(mi, -1)} disabled={mi === 0} className="btn-ghost p-1" title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveModule(mi, 1)} disabled={mi === modules.length - 1} className="btn-ghost p-1" title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditingModule(module.id); setEditModuleForm({ title: module.title, description: module.description }) }} className="btn-ghost p-1" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDelete({ type: 'module', id: module.id, label: module.title })} className="btn-ghost p-1 text-danger hover:bg-danger-bg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Lessons */}
                  <div className="divide-y divide-border">
                    {sortedLessons.map((lesson, li) => (
                      <div key={lesson.id}>
                        {editingLesson?.id === lesson.id ? (
                          <div className="p-4">
                            <LessonForm lesson={editingLesson} moduleId={module.id} onSave={d => handleLessonSaved(module.id, d)} onCancel={() => setEditingLesson(null)} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-raised transition-colors">
                            <GripVertical className="w-3.5 h-3.5 text-subtle flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink truncate">{lesson.title}</p>
                              <div className="flex gap-2 mt-0.5">
                                {lesson.is_gated && <Badge variant="neutral" className="text-2xs">Gated</Badge>}
                                {(lesson.resources?.length ?? 0) > 0 && <span className="text-2xs text-subtle">{lesson.resources.length} resources</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => moveLesson(module.id, li, -1)} disabled={li === 0} className="btn-ghost p-1"><ChevronUp className="w-3 h-3" /></button>
                              <button onClick={() => moveLesson(module.id, li, 1)} disabled={li === sortedLessons.length - 1} className="btn-ghost p-1"><ChevronDown className="w-3 h-3" /></button>
                              <button onClick={() => setEditingLesson(lesson)} className="btn-ghost p-1 text-xs"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => setConfirmDelete({ type: 'lesson', moduleId: module.id, id: lesson.id, label: lesson.title })} className="btn-ghost p-1 text-danger hover:bg-danger-bg"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add lesson button / form */}
                    {addingLesson === module.id ? (
                      <div className="p-4">
                        <LessonForm
                          moduleId={module.id}
                          onSave={d => handleLessonSaved(module.id, d)}
                          onCancel={() => setAddingLesson(null)}
                        />
                      </div>
                    ) : (
                      <button onClick={() => setAddingLesson(module.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ring hover:bg-ring-light transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Lesson
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.type === 'module' ? 'Module' : 'Lesson'}?`}
        message={`"${confirmDelete?.label}" will be permanently deleted. This action cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'module') handleDeleteModule(confirmDelete.id)
          else handleDeleteLesson(confirmDelete.moduleId, confirmDelete.id, confirmDelete.label)
        }}
      />
    </AdminLayout>
  )
}
