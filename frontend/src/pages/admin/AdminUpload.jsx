import { useState, useEffect, useRef } from 'react'
import { Upload, File, Link as LinkIcon, CheckCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api, { coursesApi } from '../../services/api'
import toast from 'react-hot-toast'

const RESOURCE_TYPES = ['pdf', 'geojson', 'pptx', 'image', 'dataset', 'link']

export default function AdminUpload() {
  const [lessons, setLessons]   = useState([])
  const [courses, setCourses]   = useState([])
  const [selCourse, setSelCourse] = useState('')
  const [selLesson, setSelLesson] = useState('')
  const [type, setType]         = useState('pdf')
  const [title, setTitle]       = useState('')
  const [file, setFile]         = useState(null)
  const [extUrl, setExtUrl]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded]   = useState([])
  const fileRef = useRef()

  useEffect(() => {
    coursesApi.list({ limit: 100 }).then(({ data }) => setCourses(data.items))
  }, [])

  useEffect(() => {
    if (!selCourse) { setLessons([]); return }
    const course = courses.find(c => c.id === selCourse)
    if (!course) return
    coursesApi.get(course.slug).then(({ data }) => {
      const all = data.modules?.flatMap(m => m.lessons?.map(l => ({ ...l, module: m.title }))) || []
      setLessons(all)
    })
  }, [selCourse, courses])

  async function handleUpload(e) {
    e.preventDefault()
    if (!selLesson || !title) { toast.error('Select a lesson and enter a title'); return }
    setUploading(true)
    try {
      if (type === 'link') {
        await api.post(`/resources/link?lesson_id=${selLesson}&title=${encodeURIComponent(title)}&url=${encodeURIComponent(extUrl)}&resource_type=link`)
        toast.success('Link added!')
      } else {
        if (!file) { toast.error('Please select a file'); setUploading(false); return }
        const fd = new FormData()
        fd.append('lesson_id', selLesson)
        fd.append('title', title)
        fd.append('resource_type', type)
        fd.append('file', file)
        await api.post('/resources/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        toast.success('File uploaded!')
      }
      setUploaded(prev => [{ title, type, lesson_id: selLesson }, ...prev])
      setTitle(''); setFile(null); setExtUrl('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    }
    setUploading(false)
  }

  return (
    <AdminLayout title="Upload Center">
      <div className="max-w-2xl">
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-ink mb-5">Upload Resource</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="label">Course</label>
              <select className="input" value={selCourse} onChange={e => { setSelCourse(e.target.value); setSelLesson('') }} required>
                <option value="">Select course…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            {lessons.length > 0 && (
              <div>
                <label className="label">Lesson</label>
                <select className="input" value={selLesson} onChange={e => setSelLesson(e.target.value)} required>
                  <option value="">Select lesson…</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>[{l.module}] {l.title}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Resource Type</label>
                <select className="input" value={type} onChange={e => setType(e.target.value)}>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Kenya Admin Boundaries" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
            </div>

            {type === 'link' ? (
              <div>
                <label className="label flex items-center gap-1"><LinkIcon className="w-3 h-3" /> External URL</label>
                <input className="input" type="url" placeholder="https://…" value={extUrl} onChange={e => setExtUrl(e.target.value)} required />
              </div>
            ) : (
              <div>
                <label className="label">File (max 50 MB)</label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-ring transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-8 h-8 text-subtle mx-auto mb-2" />
                  <p className="text-sm text-muted">{file ? file.name : 'Click to select file'}</p>
                  <p className="text-xs text-subtle mt-1">PDF, GeoJSON, PPTX, images, datasets</p>
                </div>
                <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={uploading}>
              <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload Resource'}
            </button>
          </form>
        </div>

        {/* Recent uploads */}
        {uploaded.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-3">Recently Uploaded</h3>
            <div className="space-y-2">
              {uploaded.map((u, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="font-medium text-ink">{u.title}</span>
                  <span className="text-xs text-subtle uppercase">{u.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
