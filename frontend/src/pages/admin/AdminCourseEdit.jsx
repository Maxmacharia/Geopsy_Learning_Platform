import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ChevronDown, ChevronUp, Save } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { coursesApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminCourseEdit() {
  const { courseId }  = useParams()
  const [course, setCourse]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [openMod, setOpenMod] = useState(null)
  const [modForm, setModForm] = useState({ title: '', description: '', order_index: 0 })
  const [lesForm, setLesForm] = useState({ title: '', content: '', content_preview: '', is_gated: true, order_index: 0 })
  const [activeMod, setActiveMod] = useState(null)

  useEffect(() => {
    // fetch by id — we'll use slug but courseId is the id here
    coursesApi.list({ limit: 100 }).then(({ data }) => {
      const found = data.items.find(c => c.id === courseId)
      if (found) coursesApi.get(found.slug).then(({ data: d }) => { setCourse(d); if (d.modules?.[0]) setOpenMod(d.modules[0].id) })
    }).finally(() => setLoading(false))
  }, [courseId])

  async function addModule(e) {
    e.preventDefault()
    const { data } = await coursesApi.addModule(courseId, modForm)
    setCourse(prev => ({ ...prev, modules: [...(prev.modules || []), { ...data, lessons: [] }] }))
    setModForm({ title: '', description: '', order_index: 0 })
    toast.success('Module added')
  }

  async function addLesson(e, moduleId) {
    e.preventDefault()
    const { data } = await coursesApi.addLesson(moduleId, lesForm)
    setCourse(prev => ({
      ...prev,
      modules: prev.modules.map(m => m.id === moduleId ? { ...m, lessons: [...(m.lessons || []), data] } : m)
    }))
    setLesForm({ title: '', content: '', content_preview: '', is_gated: true, order_index: 0 })
    setActiveMod(null)
    toast.success('Lesson added')
  }

  if (loading) return <AdminLayout title="Edit Course"><div className="animate-pulse space-y-3"><div className="h-6 bg-surface-raised rounded w-1/2" /><div className="h-4 bg-surface-raised rounded" /></div></AdminLayout>

  return (
    <AdminLayout title={course?.title || 'Edit Course'}>
      <div className="max-w-3xl">
        {/* Add Module */}
        <div className="card p-5 mb-6">
          <h2 className="font-semibold heading-4 mb-4">Add Module</h2>
          <form onSubmit={addModule} className="flex gap-3 flex-wrap">
            <input className="input flex-1 min-w-40" placeholder="Module title" value={modForm.title} onChange={e => setModForm(f => ({ ...f, title: e.target.value }))} required />
            <input className="input w-20" type="number" placeholder="Order" value={modForm.order_index} onChange={e => setModForm(f => ({ ...f, order_index: +e.target.value }))} />
            <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add Module</button>
          </form>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {course?.modules?.map((mod) => (
            <div key={mod.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised"
                onClick={() => setOpenMod(openMod === mod.id ? null : mod.id)}
              >
                <span className="font-semibold text-ink">{mod.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-subtle">{mod.lessons?.length} lessons</span>
                  {openMod === mod.id ? <ChevronUp className="w-4 h-4 text-subtle" /> : <ChevronDown className="w-4 h-4 text-subtle" />}
                </div>
              </button>

              {openMod === mod.id && (
                <div className="border-t border-border p-5">
                  {/* Lesson list */}
                  {mod.lessons?.length > 0 && (
                    <div className="space-y-1 mb-5">
                      {mod.lessons.map(les => (
                        <div key={les.id} className="flex items-center justify-between px-3 py-2 bg-surface-raised rounded-lg text-sm">
                          <span className="text-ink">{les.title}</span>
                          <span className="text-xs text-subtle">{les.is_gated ? '🔒 Gated' : '🔓 Free'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add lesson form */}
                  {activeMod === mod.id ? (
                    <form onSubmit={e => addLesson(e, mod.id)} className="space-y-3 border border-dashed border-border rounded-xl p-4">
                      <h4 className="text-sm font-medium text-muted">New Lesson</h4>
                      <input className="input" placeholder="Lesson title" value={lesForm.title} onChange={e => setLesForm(f => ({ ...f, title: e.target.value }))} required />
                      <textarea className="input resize-none text-xs" rows={2} placeholder="Public preview (shown before login)" value={lesForm.content_preview} onChange={e => setLesForm(f => ({ ...f, content_preview: e.target.value }))} />
                      <textarea className="input resize-none text-xs" rows={5} placeholder="Full lesson content (HTML supported)" value={lesForm.content} onChange={e => setLesForm(f => ({ ...f, content: e.target.value }))} />
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`gated-${mod.id}`} checked={lesForm.is_gated} onChange={e => setLesForm(f => ({ ...f, is_gated: e.target.checked }))} />
                        <label htmlFor={`gated-${mod.id}`} className="text-sm text-muted">Require login to read</label>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs"><Save className="w-3.5 h-3.5" /> Save Lesson</button>
                        <button type="button" className="btn-secondary text-xs" onClick={() => setActiveMod(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setActiveMod(mod.id)} className="btn-ghost text-xs text-ring border border-dashed border-ring/30 w-full justify-center py-2">
                      <Plus className="w-3.5 h-3.5" /> Add Lesson
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
