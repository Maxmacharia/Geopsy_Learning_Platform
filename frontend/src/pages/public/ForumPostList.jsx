import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MessageSquare, Pin, ChevronLeft, Send, Search } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { forumsApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function ForumPostList() {
  const { forumId }         = useParams()
  const navigate             = useNavigate()
  const { user }             = useAuthStore()

  const [forum, setForum]   = useState(null)
  const [posts, setPosts]   = useState([])
  const [page, setPage]     = useState(1)
  const [pages, setPages]   = useState(1)
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle]     = useState('')
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Load forum info and posts
    forumsApi.list().then(({ data }) => {
      const found = data.find(f => f.id === forumId)
      setForum(found || null)
    })
  }, [forumId])

  useEffect(() => {
    setLoading(true)
    forumsApi.posts(forumId, { page, limit: 20, search: search || undefined })
      .then(({ data }) => {
        setPosts(data.items)
        setPages(data.pages)
        setTotal(data.total)
      })
      .catch(() => navigate('/forums'))
      .finally(() => setLoading(false))
  }, [forumId, page, search])

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSubmitting(true)
    try {
      const { data } = await forumsApi.createPost(forumId, {
        title: newTitle,
        content: newContent,
      })
      toast.success('Post created!')
      navigate(`/forums/${forumId}/posts/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create post')
    }
    setSubmitting(false)
  }

  const timeAgo = (d) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }) }
    catch { return d }
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <Link to="/forums" className="btn-ghost text-sm mb-4 inline-flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> All Forums
        </Link>

        {/* Forum header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">
            {forum?.title || 'Forum'}
          </h1>
          {forum?.description && (
            <p className="text-muted text-sm mt-1">{forum.description}</p>
          )}
          <p className="text-xs text-subtle mt-1">{total} post{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input
            className="input pl-9"
            placeholder="Search posts…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* Create post — logged-in users */}
        {user ? (
          <div className="card mb-6">
            {showForm ? (
              <div className="p-5">
                <h2 className="heading-4 mb-4">Start a Discussion</h2>
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Post Title *
                    </label>
                    <input
                      className="input"
                      placeholder="What do you want to discuss?"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Content *
                    </label>
                    <textarea
                      className="input resize-none"
                      rows={5}
                      placeholder="Write your post…"
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting}
                    >
                      <Send className="w-4 h-4" />
                      {submitting ? 'Posting…' : 'Post'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { setShowForm(false); setNewTitle(''); setNewContent('') }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-raised transition-colors rounded-xl"
              >
                <div className="w-8 h-8 rounded-full bg-ring-light text-ring flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {user.full_name?.[0]}
                </div>
                <span className="text-sm text-subtle flex-1">
                  Start a discussion in {forum?.title}…
                </span>
                <span className="btn-primary text-xs">
                  <MessageSquare className="w-3.5 h-3.5" /> New Post
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="card p-4 mb-6 text-center text-sm text-muted bg-surface-raised">
            <Link to="/login" className="text-ring hover:underline font-medium">Login</Link>
            {' '}or{' '}
            <Link to="/register" className="text-ring hover:underline font-medium">Register</Link>
            {' '}to start a discussion
          </div>
        )}

        {/* Posts list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card h-16 animate-pulse bg-surface-raised" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-subtle">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm">Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/forums/${forumId}/posts/${p.id}`}
                className="card p-4 flex items-start gap-3 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-ring-light text-ring flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {p.author?.full_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.is_pinned && (
                      <Pin className="w-3 h-3 text-warning flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-ink group-hover:text-ring transition-colors text-sm">
                      {p.title}
                    </h3>
                  </div>
                  <p className="text-xs text-subtle mt-0.5 truncate">
                    {p.author?.full_name}
                    {p.author?.institution && ` · ${p.author.institution}`}
                    {' · '}{timeAgo(p.created_at)}
                    {' · '}{p.comment_count} comment{p.comment_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-subtle">
                  {p.view_count} views
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              className="btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span className="text-sm text-muted">Page {page} of {pages}</span>
            <button
              className="btn-secondary"
              disabled={page === pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
