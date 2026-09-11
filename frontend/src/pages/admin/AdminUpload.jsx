import { useState, useEffect, useRef } from 'react'
import { Upload, Link as LinkIcon, CheckCircle, Code, X } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api, { coursesApi } from '../../services/api'
import toast from 'react-hot-toast'

const RESOURCE_TYPES = [
  { group: 'Documents',  items: [
    { value: 'pdf',      label: 'PDF',            ext: '.pdf' },
    { value: 'pptx',     label: 'PowerPoint',     ext: '.pptx / .ppt' },
    { value: 'markdown', label: 'Markdown',       ext: '.md' },
  ]},
  { group: 'GIS Data',   items: [
    { value: 'geojson',    label: 'GeoJSON',        ext: '.geojson' },
    { value: 'shapefile',  label: 'Shapefile (ZIP)', ext: '.zip' },
    { value: 'geopackage', label: 'GeoPackage',      ext: '.gpkg' },
    { value: 'raster',     label: 'Raster',          ext: '.tif / .img' },
    { value: 'dataset',    label: 'Dataset (CSV/Excel)', ext: '.csv / .xlsx' },
  ]},
  { group: 'Code',       items: [
    { value: 'python',   label: 'Python Script',  ext: '.py' },
    { value: 'r_script', label: 'R Script',       ext: '.R' },
    { value: 'notebook', label: 'Jupyter Notebook', ext: '.ipynb' },
    { value: 'sql',      label: 'SQL Script',     ext: '.sql' },
  ]},
  { group: 'Media',      items: [
    { value: 'image',    label: 'Image',          ext: '.png / .jpg / .webp' },
    { value: 'video',    label: 'Video',          ext: '.mp4 / .webm' },
    { value: 'zip',      label: 'ZIP Archive',    ext: '.zip' },
  ]},
  { group: 'Links',      items: [
    { value: 'link',     label: 'External Link',  ext: 'URL' },
  ]},
]

const LANGUAGES = ['python', 'r', 'sql', 'javascript', 'markdown', 'json', 'bash', 'text']

export default function AdminUpload() {
  const [courses, setCourses]     = useState([])
  const [lessons, setLessons]     = useState([])
  const [selCourse, setSelCourse] = useState('')
  const [selLesson, setSelLesson] = useState('')
  const [type, setType]           = useState('pdf')
  const [title, setTitle]         = useState('')
  const [file, setFile]           = useState(null)
  const [extUrl, setExtUrl]       = useState('')
  const [snippetLang, setSnippetLang] = useState('python')
  const [snippetCode, setSnippetCode] = useState('')
  const [mode, setMode]           = useState('file')  // file | link | snippet
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded]   = useState([])
  const fileRef = useRef()

  const isCode    = ['python', 'r_script', 'sql', 'markdown', 'notebook'].includes(type)
  const isLink    = type === 'link'
  const isMedia   = ['image', 'video'].includes(type)
  const isGIS     = ['geojson', 'shapefile', 'geopackage', 'raster', 'dataset'].includes(type)

  useEffect(() => {
    coursesApi.list({ limit: 50 })
      .then(({ data }) => {
        // Handles direct array, data.items, or data.courses
        const courseList = Array.isArray(data) ? data : (data.items || data.courses || [])
        setCourses(courseList)
      })
      .catch(err => {
        console.error('Failed to load courses:', err)
        toast.error('Could not load courses list')
      })
  }, [])

  useEffect(() => {
    if (!selCourse) { setLessons([]); setSelLesson(''); return }
    const course = courses.find(c => c.id === selCourse)
    if (!course) return
    coursesApi.get(course.slug).then(({ data }) => {
      const all = data.modules?.flatMap(m =>
        m.lessons?.map(l => ({ ...l, moduleTitle: m.title }))
      ) || []
      setLessons(all)
    })
  }, [selCourse, courses])

  // Auto-switch mode based on type
  useEffect(() => {
    if (isLink) setMode('link')
    else setMode('file')
  }, [type])

  async function handleUpload(e) {
    e.preventDefault()
    if (!selLesson || !title.trim()) { toast.error('Select a lesson and enter a title'); return }
    setUploading(true)
    try {
      if (mode === 'snippet') {
        await api.post(`/resources/code-snippet`, new URLSearchParams({
          lesson_id: selLesson, title, language: snippetLang, code: snippetCode
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        toast.success('Code snippet added!')
      } else if (mode === 'link') {
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
      setUploaded(prev => [{ title, type: mode === 'snippet' ? 'code_snippet' : type }, ...prev])
      setTitle(''); setFile(null); setExtUrl(''); setSnippetCode('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    }
    setUploading(false)
  }

  const selectedTypeInfo = RESOURCE_TYPES.flatMap(g => g.items).find(i => i.value === type)

  return (
    <AdminLayout title="Upload Center">
      <div className="max-w-2xl space-y-6">
        <div className="card p-6">
          <h2 className="heading-4 mb-5 flex items-center gap-2">
            <Upload className="w-4 h-4 text-ring" /> Upload Resource to Lesson
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Course + lesson */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Course *</label>
                <select className="input" value={selCourse} onChange={e => { setSelCourse(e.target.value); setSelLesson('') }} required>
                  <option value="">Select course…</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Lesson *</label>
                <select className="input" value={selLesson} onChange={e => setSelLesson(e.target.value)} required disabled={!lessons.length}>
                  <option value="">{lessons.length ? 'Select lesson…' : 'Select course first…'}</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>[{l.moduleTitle}] {l.title}</option>)}
                </select>
              </div>
            </div>

            {/* Resource type — grouped select */}
            <div>
              <label className="label">Resource Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value)}>
                {RESOURCE_TYPES.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map(item => (
                      <option key={item.value} value={item.value}>{item.label} ({item.ext})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="label">Resource Title *</label>
              <input className="input" placeholder={`e.g. ${selectedTypeInfo?.label || 'Resource'} title`} value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            {/* Code snippet toggle for code types */}
            {isCode && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('file')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'file' ? 'border-ring bg-ring-light text-ring' : 'border-border text-muted hover:bg-surface-raised'}`}>
                  Upload File
                </button>
                <button type="button" onClick={() => setMode('snippet')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${mode === 'snippet' ? 'border-ring bg-ring-light text-ring' : 'border-border text-muted hover:bg-surface-raised'}`}>
                  <Code className="w-3.5 h-3.5 inline mr-1" /> Paste Code
                </button>
              </div>
            )}

            {/* Input area */}
            {mode === 'snippet' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Code Snippet *</label>
                  <select className="input w-28 text-xs py-1" value={snippetLang} onChange={e => setSnippetLang(e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <textarea
                  className="input resize-y font-mono text-xs"
                  rows={12}
                  placeholder="Paste your code here…"
                  value={snippetCode}
                  onChange={e => setSnippetCode(e.target.value)}
                  required
                />
              </div>
            )}

            {mode === 'link' && (
              <div>
                <label className="label">External URL *</label>
                <input className="input" type="url" placeholder="https://…" value={extUrl} onChange={e => setExtUrl(e.target.value)} required />
              </div>
            )}

            {mode === 'file' && (
              <div>
                <label className="label">
                  File{selectedTypeInfo ? ` (${selectedTypeInfo.ext})` : ''} — max 50 MB
                </label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-ring transition-colors cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-subtle mx-auto mb-2" />
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-ink">
                      <span className="truncate max-w-xs">{file.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                        className="text-danger hover:text-danger/70"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted">Click to select file</p>
                      {selectedTypeInfo && <p className="text-xs text-subtle mt-1">{selectedTypeInfo.ext}</p>}
                    </>
                  )}
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={uploading}>
              <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload Resource'}
            </button>
          </form>
        </div>

        {/* Recent uploads log */}
        {uploaded.length > 0 && (
          <div className="card p-5">
            <h3 className="heading-4 mb-3">Uploaded This Session</h3>
            <div className="space-y-2">
              {uploaded.map((u, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="font-medium text-ink">{u.title}</span>
                  <span className="text-xs text-muted uppercase">{u.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
