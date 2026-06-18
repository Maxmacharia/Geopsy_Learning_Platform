import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Trash2, ArrowRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { usersApi } from '../../services/api'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

const DIFF_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

export default function Bookmarks() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi.bookmarks().then(({ data }) => setItems(data)).finally(() => setLoading(false))
  }, [])

  async function remove(courseId) {
    await usersApi.removeBookmark(courseId)
    setItems(prev => prev.filter(b => b.course_id !== courseId))
    toast.success('Bookmark removed')
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="heading-1 mb-1">My Bookmarks</h1>
          <p className="text-muted">{items.length} saved course{items.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-16 animate-pulse bg-surface-raised" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-subtle">
            <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted">No bookmarks yet</p>
            <p className="text-sm mt-1">Save courses to revisit them here</p>
            <Link to="/courses" className="btn-primary mt-5 inline-flex">
              Browse Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(b => (
              <div key={b.bookmark_id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/courses/${b.slug}`}
                    className="text-sm font-semibold text-ink hover:text-ring transition-colors line-clamp-1"
                  >
                    {b.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {b.category && <Badge variant="ring">{b.category}</Badge>}
                    {b.difficulty && <Badge variant={DIFF_VARIANT[b.difficulty] || 'neutral'}>{b.difficulty}</Badge>}
                  </div>
                </div>
                <button
                  onClick={() => remove(b.course_id)}
                  className="btn-ghost text-danger hover:bg-danger-bg flex-shrink-0 p-2"
                  aria-label="Remove bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
