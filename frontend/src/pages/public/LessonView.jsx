import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Lock, Download, FileText, ExternalLink, Map } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { coursesApi, resourcesApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const LeafletMap = lazy(() => import('../../components/maps/LeafletMap'))

const FILE_ICONS = { pdf: FileText, geojson: Map, link: ExternalLink, pptx: FileText, dataset: Download }

export default function LessonView() {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const [lesson, setLesson]   = useState(null)
  const [loading, setLoading] = useState(true)
  const contentRef            = useRef(null)
  const progressSent          = useRef(false)

  useEffect(() => {
    coursesApi.getLesson(id)
      .then(({ data }) => setLesson(data))
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [id])

  const handleScroll = useCallback(() => {
    if (!user || !contentRef.current || progressSent.current) return
    const el  = contentRef.current
    const pct = Math.min(100, Math.round(((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100))
    if (pct >= 80) {
      progressSent.current = true
      coursesApi.updateProgress(id, pct).catch(() => {})
    }
  }, [id, user])

  async function handleDownload(resource) {
    if (!user) { navigate('/login'); return }
    try {
      const { data } = await resourcesApi.download(resource.id)
      window.open(data.download_url, '_blank')
    } catch { toast.error('Download failed') }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-3 animate-pulse">
          <div className="h-8 bg-surface-raised rounded w-3/4" />
          <div className="h-4 bg-surface-raised rounded" />
          <div className="h-4 bg-surface-raised rounded w-5/6" />
        </div>
      </PageWrapper>
    )
  }

  const isGated = lesson?.is_gated && !user

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-ink mb-6">{lesson?.title}</h1>

        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="prose prose-sm sm:prose max-w-none text-muted leading-relaxed"
          style={{ maxHeight: isGated ? '320px' : undefined, overflowY: isGated ? 'hidden' : 'visible' }}
        >
          {isGated
            ? <div dangerouslySetInnerHTML={{ __html: lesson?.content_preview || '<p>Preview not available.</p>' }} />
            : <div dangerouslySetInnerHTML={{ __html: lesson?.content || lesson?.content_preview || '<p>No content yet.</p>' }} />
          }
        </div>

        {isGated && (
          <div className="relative -mt-16 pt-16 pb-8 px-4 text-center bg-gradient-to-t from-white via-white/90 to-transparent rounded-b-xl">
            <Lock className="w-8 h-8 text-subtle mx-auto mb-2" />
            <h3 className="font-bold text-ink mb-1">Continue reading with a free account</h3>
            <p className="text-sm text-muted mb-4">Register in seconds — no credit card required.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="btn-primary">Register Free</Link>
              <Link to="/login"    className="btn-secondary">Login</Link>
            </div>
          </div>
        )}

        {user && lesson?.resources?.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base heading-4 mb-3">Lesson Resources</h2>
            <div className="space-y-2">
              {lesson.resources.map((r) => {
                const Icon = FILE_ICONS[r.type] || FileText
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 card hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-info-bg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-ring" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{r.title}</p>
                        <p className="text-xs text-subtle uppercase">
                          {r.type}{r.file_size_bytes ? ` · ${(r.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDownload(r)} className="btn-ghost text-ring text-xs flex-shrink-0">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {user && lesson?.embedded_maps?.length > 0 && (
          <div className="mt-10 space-y-6">
            <h2 className="text-base font-semibold text-ink">Interactive Maps</h2>
            {lesson.embedded_maps.map((m) => (
              <Suspense key={m.id} fallback={<div className="h-64 bg-surface-raised rounded-xl animate-pulse" />}>
                <LeafletMap
                  geojson={m.geojson_data}
                  centerLat={m.center_lat ?? -1.286}
                  centerLng={m.center_lng ?? 36.817}
                  zoom={m.zoom_level}
                  title={m.title}
                  height="380px"
                />
              </Suspense>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
