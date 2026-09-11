import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Unlock, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Layers, HelpCircle, ArrowRight, Clock, Award } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import Badge from '../../components/ui/Badge'
import { coursesApi, usersApi, attemptsApi } from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const DIFF_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

export default function CourseDetail() {
  const { slug }  = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const [course, setCourse]         = useState(null)
  const [quizzes, setQuizzes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [openMods, setOpenMods]     = useState({})
  const [bookmarked, setBookmarked] = useState(false)
  const [bmLoading, setBmLoading]   = useState(false)

  useEffect(() => {
    coursesApi.get(slug)
      .then(({ data }) => {
        setCourse(data)
        if (data.modules?.[0]) setOpenMods({ [data.modules[0].id]: true })
        
        // Fetch quizzes belonging to this course
        if (data.id) {
          attemptsApi.getCourseQuizzes(data.id)
            .then((res) => setQuizzes(Array.isArray(res.data) ? res.data : res.data?.items || []))
            .catch(() => setQuizzes([]))
        }
      })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false))
  }, [slug])

  async function toggleBookmark() {
    if (!user) { navigate('/login'); return }
    setBmLoading(true)
    try {
      if (bookmarked) {
        await usersApi.removeBookmark(course.id)
        setBookmarked(false)
        toast.success('Bookmark removed')
      } else {
        await usersApi.addBookmark(course.id)
        setBookmarked(true)
        toast.success('Course saved to bookmarks')
      }
    } catch { toast.error('Failed to update bookmark') }
    setBmLoading(false)
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-4">
          <div className="h-8 bg-surface-raised rounded w-2/3" />
          <div className="h-4 bg-surface-raised rounded w-1/2" />
          <div className="h-4 bg-surface-raised rounded w-3/4" />
        </div>
      </PageWrapper>
    )
  }
  if (!course) return null

  return (
    <PageWrapper>
      {/* Course hero */}
      <div className="bg-ink text-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-wrap gap-2 mb-4">
            {course.category && <Badge variant="ring">{course.category}</Badge>}
            <Badge variant={DIFF_VARIANT[course.difficulty] || 'neutral'}>{course.difficulty}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-balance text-surface">{course.title}</h1>
          {course.description && (
            <p className="text-surface/70 text-base leading-relaxed mb-6 max-w-2xl">{course.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-surface/60 text-sm">
              <Layers className="w-4 h-4" />
              {course.module_count} module{course.module_count !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-3 ml-auto">
              <button
                onClick={toggleBookmark}
                disabled={bmLoading}
                className="btn-secondary bg-transparent border-surface/30 text-surface hover:bg-surface/10 text-sm"
              >
                {bookmarked
                  ? <><BookmarkCheck className="w-4 h-4 text-ring" /> Saved</>
                  : <><Bookmark className="w-4 h-4" /> Save</>
                }
              </button>
              {!user && (
                <Link to="/register" className="btn-primary bg-ring hover:bg-ring-dark text-sm">
                  Enroll Free
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="heading-3 mb-5">Course Curriculum</h2>
        {course.modules?.length === 0 && (
          <p className="text-muted text-sm">No content published yet.</p>
        )}
        <div className="space-y-3">
          {course.modules?.map((mod) => (
            <div key={mod.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised transition-colors"
                onClick={() => setOpenMods(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                aria-expanded={!!openMods[mod.id]}
              >
                <span className="font-semibold text-ink text-sm">{mod.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {mod.lessons?.length} lesson{mod.lessons?.length !== 1 ? 's' : ''}
                  </span>
                  {openMods[mod.id]
                    ? <ChevronUp className="w-4 h-4 text-subtle" />
                    : <ChevronDown className="w-4 h-4 text-subtle" />}
                </div>
              </button>

              {openMods[mod.id] && (
                <div className="border-t border-border divide-y divide-border">
                  {mod.lessons?.map((les) => (
                    <div key={les.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        {les.is_gated && !user
                          ? <Lock className="w-3.5 h-3.5 text-subtle flex-shrink-0" />
                          : <Unlock className="w-3.5 h-3.5 text-success flex-shrink-0" />
                        }
                        <span className="text-sm text-ink">{les.title}</span>
                      </div>
                      {les.is_gated && !user
                        ? <Link to="/login" className="text-xs text-ring hover:underline">Login to read</Link>
                        : <Link to={`/lessons/${les.id}`} className="text-xs text-ring hover:underline">Read →</Link>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quizzes Section */}
        {quizzes.length > 0 && (
          <div className="mt-10">
            <h2 className="heading-3 mb-4 flex items-center gap-2 text-ink">
              <HelpCircle className="w-5 h-5 text-ring" />
              Course Assessments
            </h2>
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id} 
                  className="card p-4 flex items-center justify-between bg-surface-raised/50 hover:bg-surface-raised transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-semibold text-sm text-ink truncate">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-xs text-muted truncate mt-0.5">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-subtle mt-2">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Pass: {quiz.passing_score_pct}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 
                        {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} mins` : 'No time limit'}
                      </span>
                    </div>
                  </div>

                  {user ? (
                    <Link 
                      to={`/quiz/${quiz.id}`} 
                      className="btn-primary text-xs flex items-center gap-1.5 flex-shrink-0"
                    >
                      Take Quiz <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link 
                      to="/login" 
                      className="btn-secondary text-xs flex items-center gap-1 flex-shrink-0"
                    >
                      Login to Attempt
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gate CTA for public */}
        {!user && (
          <div className="mt-10 card p-8 text-center bg-info-bg border-border">
            <Lock className="w-10 h-10 text-subtle mx-auto mb-3" />
            <h3 className="heading-3 mb-2">Full access requires a free account</h3>
            <p className="text-muted text-sm mb-6">Register in seconds — no credit card required.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="btn-primary">Create Free Account</Link>
              <Link to="/login"    className="btn-secondary">Log In</Link>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
