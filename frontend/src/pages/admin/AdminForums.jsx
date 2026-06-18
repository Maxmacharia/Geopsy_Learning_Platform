import { useState, useEffect } from 'react'
import { Plus, Trash2, Pin, MessageSquare, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import { forumsApi } from '../../services/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function AdminForums() {
  const [forums, setForums]     = useState([])
  const [selForum, setSelForum] = useState(null)
  const [posts, setPosts]       = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [fTitle, setFTitle]     = useState('')
  const [fDesc, setFDesc]       = useState('')
  const [fCat, setFCat]         = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    forumsApi.list().then(({ data }) => {
      setForums(data)
      if (data.length > 0) setSelForum(data[0])
    })
  }, [])

  useEffect(() => {
    if (!selForum) return
    setLoadingPosts(true)
    forumsApi.posts(selForum.id, { limit: 50 })
      .then(({ data }) => setPosts(data.items))
      .finally(() => setLoadingPosts(false))
  }, [selForum])

  async function handleCreateForum(e) {
    e.preventDefault()
    if (!fTitle.trim()) return
    setCreating(true)
    try {
      const { data } = await forumsApi.createForum({
        title: fTitle,
        description: fDesc || undefined,
        category: fCat || undefined,
      })
      setForums(prev => [...prev, data])
      setSelForum(data)
      setFTitle(''); setFDesc(''); setFCat('')
      setShowForm(false)
      toast.success('Forum created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create forum')
    }
    setCreating(false)
  }

  async function handlePin(postId, isPinned) {
    try {
      const { data } = await forumsApi.pin(postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: data.is_pinned } : p))
      toast.success(data.is_pinned ? 'Post pinned' : 'Post unpinned')
    } catch { toast.error('Failed') }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Delete this post and all its comments?')) return
    try {
      await forumsApi.deletePost(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
      setForums(prev => prev.map(f =>
        f.id === selForum?.id ? { ...f, post_count: f.post_count - 1 } : f
      ))
      toast.success('Post deleted')
    } catch { toast.error('Failed to delete') }
  }

  const timeAgo = d => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }) }
    catch { return d }
  }

  return (
    <AdminLayout title="Forum Management">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Forum list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink">Forums</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Create forum form */}
          {showForm && (
            <div className="card p-4 mb-3">
              <form onSubmit={handleCreateForum} className="space-y-2">
                <input
                  className="input text-sm"
                  placeholder="Forum title *"
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  className="input text-sm"
                  placeholder="Description (optional)"
                  value={fDesc}
                  onChange={e => setFDesc(e.target.value)}
                />
                <input
                  className="input text-sm"
                  placeholder="Category e.g. QGIS, Remote Sensing"
                  value={fCat}
                  onChange={e => setFCat(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-xs flex-1 justify-center" disabled={creating}>
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button type="button" className="btn-secondary text-xs" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Forum list */}
          <div className="space-y-1">
            {forums.length === 0 && (
              <p className="text-sm text-subtle py-4 text-center">No forums yet</p>
            )}
            {forums.map(f => (
              <button
                key={f.id}
                onClick={() => setSelForum(f)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                  selForum?.id === f.id
                    ? 'bg-info-bg text-ring font-medium'
                    : 'text-muted hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{f.title}</span>
                </div>
                <span className="text-xs text-subtle flex-shrink-0 ml-2">{f.post_count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Posts panel */}
        <div className="md:col-span-2">
          {!selForum ? (
            <div className="card p-8 text-center text-subtle">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Select a forum to manage its posts</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-ink">
                  Posts in "{selForum.title}"
                </h2>
                <Link
                  to={`/forums/${selForum.id}`}
                  target="_blank"
                  className="btn-ghost text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </Link>
              </div>

              {loadingPosts ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card h-14 animate-pulse bg-surface-raised" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="card p-8 text-center text-subtle">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No posts in this forum yet</p>
                  <p className="text-xs mt-1">Users post from the public forum page</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {posts.map(p => (
                    <div key={p.id} className="card p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {p.is_pinned && (
                            <Pin className="w-3 h-3 text-warning flex-shrink-0" />
                          )}
                          <Link
                            to={`/forums/${selForum.id}/posts/${p.id}`}
                            target="_blank"
                            className="text-sm font-medium text-ink hover:text-ring transition-colors truncate"
                          >
                            {p.title}
                          </Link>
                        </div>
                        <p className="text-xs text-subtle">
                          {p.author?.full_name} · {timeAgo(p.created_at)} · {p.comment_count} comments · {p.view_count} views
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handlePin(p.id, p.is_pinned)}
                          className={`btn-ghost text-xs p-1.5 ${p.is_pinned ? 'text-warning' : 'text-subtle'}`}
                          title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(p.id)}
                          className="btn-ghost text-xs p-1.5 text-red-400 hover:bg-danger-bg"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
