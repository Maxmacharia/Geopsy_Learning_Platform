import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ChevronRight } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { forumsApi } from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function Forums() {
  const [forums, setForums]   = useState([])
  const [loading, setLoading] = useState(true)
  const { user }              = useAuthStore()

  useEffect(() => {
    forumsApi.list().then(({ data }) => setForums(data)).finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="heading-1 mb-1">Community Forums</h1>
          <p className="text-muted">Connect, ask questions, and share GIS knowledge</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse bg-surface-raised" />
            ))}
          </div>
        ) : forums.length === 0 ? (
          <div className="text-center py-20 text-subtle">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted">No forums yet</p>
            <p className="text-sm mt-1">An admin needs to create forums first</p>
          </div>
        ) : (
          <div className="space-y-2">
            {forums.map(forum => (
              <Link
                key={forum.id}
                to={`/forums/${forum.id}`}
                className="card p-5 flex items-center gap-4 hover:shadow-card-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-info-bg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-ring" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink group-hover:text-ring transition-colors">
                    {forum.title}
                  </h3>
                  {forum.description && (
                    <p className="text-sm text-muted truncate mt-0.5">{forum.description}</p>
                  )}
                  {forum.category && (
                    <span className="text-xs text-ring font-medium">{forum.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-ink">{forum.post_count}</p>
                    <p className="text-xs text-muted">posts</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-subtle" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {!user && (
          <div className="mt-10 card p-6 bg-info-bg border-border text-center">
            <p className="font-medium text-ink mb-3">Join the community to post and comment</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="btn-primary">Register Free</Link>
              <Link to="/login"    className="btn-secondary">Log In</Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
