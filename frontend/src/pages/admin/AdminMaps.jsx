import { useState, useEffect, Suspense, lazy } from 'react'
import { Plus, Trash2, Map } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { coursesApi, mapsApi } from '../../services/api'
import toast from 'react-hot-toast'

const LeafletMap = lazy(() => import('../../components/maps/LeafletMap'))

export default function AdminMaps() {
  const [courses, setCourses]   = useState([])
  const [lessons, setLessons]   = useState([])
  const [selCourse, setSelCourse] = useState('')
  const [selLesson, setSelLesson] = useState('')
  const [form, setForm] = useState({
    title: '',
    center_lat: '-1.2864',
    center_lng: '36.8172',
    zoom_level: '7',
  })
  const [geojsonText, setGeojsonText] = useState('')
  const [geojsonError, setGeojsonError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)   // parsed GeoJSON for preview

  // Load all courses
  useEffect(() => {
    coursesApi.list({ limit: 50 })
      .then(({ data }) => {
        const courseList = Array.isArray(data) ? data : (data.items || data.courses || [])
        setCourses(courseList)
      })
      .catch(err => {
        console.error('Failed to load courses:', err)
        toast.error('Could not load courses list')
      })
  }, [])

  // When course selected, load its lessons
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

  function validateGeoJSON(text) {
    if (!text.trim()) { setGeojsonError(''); setPreview(null); return null }
    try {
      const parsed = JSON.parse(text)
      if (!parsed.type) throw new Error('Missing "type" field')
      setGeojsonError('')
      setPreview(parsed)
      return parsed
    } catch (e) {
      setGeojsonError(`Invalid GeoJSON: ${e.message}`)
      setPreview(null)
      return null
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!selLesson) { toast.error('Please select a lesson'); return }

    let geojson = null
    if (geojsonText.trim()) {
      geojson = validateGeoJSON(geojsonText)
      if (!geojson) { toast.error('Fix GeoJSON before saving'); return }
    }

    setSaving(true)
    try {
      await mapsApi.create({
        lesson_id:   selLesson,
        title:       form.title,
        center_lat:  parseFloat(form.center_lat),
        center_lng:  parseFloat(form.center_lng),
        zoom_level:  parseInt(form.zoom_level),
        ...(geojson ? { geojson_data: JSON.stringify(geojson) } : {}),
      })
      toast.success('Map added to lesson!')
      setForm({ title: '', center_lat: '-1.2864', center_lng: '36.8172', zoom_level: '7' })
      setGeojsonText('')
      setPreview(null)
      setSelLesson('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create map')
    }
    setSaving(false)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <AdminLayout title="Embedded Maps">
      <div className="max-w-3xl space-y-6">

        {/* Info banner */}
        <div className="card p-4 bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>How maps work:</strong> Attach an interactive Leaflet map to any lesson.
            Students see it after logging in. You can optionally paste GeoJSON data
            (e.g. Kenya boundaries, district polygons, sample datasets) to overlay on the map.
          </p>
        </div>

        {/* Create form */}
        <div className="card p-6">
          <h2 className="font-semibold text-ink mb-5 flex items-center gap-2">
            <Map className="w-4 h-4 text-ring" /> Add Map to Lesson
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">

            {/* Course & Lesson selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Course *</label>
                <select
                  className="input"
                  value={selCourse}
                  onChange={e => { setSelCourse(e.target.value); setSelLesson('') }}
                  required
                >
                  <option value="">Select course…</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Lesson *</label>
                <select
                  className="input"
                  value={selLesson}
                  onChange={e => setSelLesson(e.target.value)}
                  required
                  disabled={lessons.length === 0}
                >
                  <option value="">{lessons.length === 0 ? 'Select course first…' : 'Select lesson…'}</option>
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>[{l.moduleTitle}] {l.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Map title */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Map Title *</label>
              <input
                className="input"
                placeholder="e.g. Kenya Administrative Boundaries"
                value={form.title}
                onChange={set('title')}
                required
              />
            </div>

            {/* Center coordinates & zoom */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Center Latitude
                </label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="-1.2864"
                  value={form.center_lat}
                  onChange={set('center_lat')}
                />
                <p className="text-xs text-subtle mt-0.5">Default: Nairobi</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Center Longitude
                </label>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="36.8172"
                  value={form.center_lng}
                  onChange={set('center_lng')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Zoom Level (1–18)
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="18"
                  value={form.zoom_level}
                  onChange={set('zoom_level')}
                />
                <p className="text-xs text-subtle mt-0.5">6=country, 10=city</p>
              </div>
            </div>

            {/* GeoJSON input */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                GeoJSON Data <span className="text-subtle font-normal">(optional)</span>
              </label>
              <textarea
                className={`input resize-y font-mono text-xs ${geojsonError ? 'border-red-300 focus:ring-red-400' : ''}`}
                rows={6}
                placeholder={'Paste GeoJSON here, e.g.:\n{\n  "type": "FeatureCollection",\n  "features": [...]\n}'}
                value={geojsonText}
                onChange={e => { setGeojsonText(e.target.value); validateGeoJSON(e.target.value) }}
              />
              {geojsonError && (
                <p className="text-xs text-red-500 mt-1">{geojsonError}</p>
              )}
              {!geojsonError && preview && (
                <p className="text-xs text-green-600 mt-1">✓ Valid GeoJSON</p>
              )}
              <p className="text-xs text-subtle mt-1">
                Tip: Download free Kenya GeoJSON from{' '}
                <a href="https://data.humdata.org/dataset/cod-ab-ken" target="_blank" rel="noreferrer" className="text-ring hover:underline">
                  HDX
                </a>
                {' '}or{' '}
                <a href="https://geojson.io" target="_blank" rel="noreferrer" className="text-ring hover:underline">
                  geojson.io
                </a>
              </p>
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus className="w-4 h-4" />
              {saving ? 'Saving…' : 'Attach Map to Lesson'}
            </button>
          </form>
        </div>

        {/* Live preview */}
        {(preview || (form.center_lat && form.center_lng)) && (
          <div className="card p-5">
            <h3 className="font-semibold text-ink mb-3">Map Preview</h3>
            <Suspense fallback={<div className="h-64 bg-surface-raised rounded-xl animate-pulse" />}>
              <LeafletMap
                geojson={preview}
                centerLat={parseFloat(form.center_lat) || -1.2864}
                centerLng={parseFloat(form.center_lng) || 36.8172}
                zoom={parseInt(form.zoom_level) || 7}
                title={form.title || 'Map Preview'}
                height="360px"
              />
            </Suspense>
          </div>
        )}

        {/* Usage guide */}
        <div className="card p-5 bg-surface-raised">
          <h3 className="font-semibold text-ink mb-3 text-sm">How students see maps</h3>
          <ol className="text-sm text-muted space-y-1.5 list-decimal list-inside">
            <li>Student opens a lesson page</li>
            <li>After the lesson content, an interactive map section appears</li>
            <li>Map shows OpenStreetMap tiles + any GeoJSON you attached</li>
            <li>Students can click features to see properties, zoom, and see coordinates</li>
            <li>Map requires the student to be logged in (gated with lesson)</li>
          </ol>
        </div>
      </div>
    </AdminLayout>
  )
}
