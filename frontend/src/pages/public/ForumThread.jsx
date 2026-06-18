import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Pin, ChevronLeft, Send, Trash2, Eye } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import { forumsApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function ForumThread() {
  const { forumId, postId } = useParams()
  const navigate             = useNavigate()
  const { user }             = useAuthStore()
  const isAdmin              = user?.role === 'admin'

  const [post, setPost]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    forumsApi.post(postId)
      .then(({ data }) => setPost(data))
      .catch(() => navigate(`/forums/${forumId}`))
      .finally(() => setLoading(false))
  }, [postId])

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const { data } = await forumsApi.comment(postId, { content: comment })
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), data] }))
      setComment('')
      toast.success('Comment added')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to comment')
    }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post and all its comments?')) return
    try {
      await forumsApi.deletePost(postId)
      toast.success('Post deleted')
      navigate(`/forums/${forumId}`)
    } catch { toast.error('Failed to delete') }
  }

  async function handlePin() {
    try {
      const { data } = await forumsApi.pin(postId)
      setPost(prev => ({ ...prev, is_pinned: data.is_pinned }))
      toast.success(data.is_pinned ? 'Post pinned' : 'Post unpinned')
    } catch { toast.error('Failed') }
  }

  async function handleDeleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return
    try {
      await forumsApi.deleteComment(commentId)
      setPost(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }))
      toast.success('Comment deleted')
    } catch { toast.error('Failed') }
  }

  const timeAgo = (d) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }) }
    catch { return d }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-3 animate-pulse">
          <div className="h-6 bg-surface-raised rounded w-2/3" />
          <div className="h-4 bg-surface-raised rounded" />
          <div className="h-4 bg-surface-raised rounded w-5/6" />
          <div className="h-32 bg-surface-raised rounded mt-4" />
        </div>
      </PageWrapper>
    )
  }

  if (!post) return null

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <Link
          to={`/forums/${forumId}`}
          className="btn-ghost text-sm mb-4 inline-flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Forum
        </Link>

        {/* Post */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              {post.is_pinned && (
                <span className="inline-flex items-center gap-1 text-xs text-warning bg-warning-bg px-2 py-0.5 rounded-full mb-2">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              <h1 className="heading-3">{post.title}</h1>
              <div className="flex items-center gap-2 text-xs text-subtle mt-2 flex-wrap">
                <div className="w-6 h-6 rounded-full bg-ring-light text-ring flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {post.author?.full_name?.[0]}
                </div>
                <span className="font-medium text-muted">{post.author?.full_name}</span>
                {post.author?.institution && (
                  <><span>·</span><span>{post.author.institution}</span></>
                )}
                <span>·</span>
                <span>{timeAgo(post.created_at)}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count} views</span>
              </div>
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={handlePin}
                  className={`btn-ghost text-xs p-2 ${post.is_pinned ? 'text-warning' : 'text-subtle'}`}
                  title={post.is_pinned ? 'Unpin post' : 'Pin post'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-ghost text-xs p-2 text-danger hover:bg-danger-bg"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div
            className="prose prose-sm max-w-none text-muted leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Comments */}
        <div className="mb-5">
          <h2 className="heading-4 mb-3">
            {post.comments?.length || 0} Comment{post.comments?.length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-3">
            {post.comments?.length === 0 && (
              <p className="text-sm text-subtle py-4 text-center">No comments yet. Be the first!</p>
            )}
            {post.comments?.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-subtle mb-2">
                    <div className="w-6 h-6 rounded-full bg-surface-raised text-muted flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {c.author?.full_name?.[0]}
                    </div>
                    <span className="font-medium text-muted">{c.author?.full_name}</span>
                    <span>·</span>
                    <span>{timeAgo(c.created_at)}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="btn-ghost text-xs p-1 text-red-400 hover:bg-danger-bg flex-shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div
                  className="text-sm text-muted"
                  dangerouslySetInnerHTML={{ __html: c.content }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comment form */}
        {user ? (
          <form onSubmit={handleComment} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-ring-light text-ring flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                {user.full_name?.[0]}
              </div>
              <div className="flex-1">
                <textarea
                  className="input resize-none mb-3"
                  rows={3}
                  placeholder="Write a comment…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !comment.trim()}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting…' : 'Post Comment'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm text-muted mb-3">Join the discussion</p>
            <div className="flex gap-3 justify-center">
              <Link to="/login"    className="btn-primary">Login</Link>
              <Link to="/register" className="btn-secondary">Register Free</Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
