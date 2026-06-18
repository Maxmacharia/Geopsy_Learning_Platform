import { useState, useEffect, useCallback } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import PageWrapper from '../../components/layout/PageWrapper'
import CourseCard from '../../components/courses/CourseCard'
import Badge from '../../components/ui/Badge'
import { coursesApi } from '../../services/api'

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const DIFF_LABEL   = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

export default function Courses() {
  const [courses, setCourses]       = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState('')
  const [difficulty, setDifficulty] = useState('')

  useEffect(() => {
    coursesApi.categories().then(({ data }) => setCategories(data)).catch(() => {})
  }, [])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await coursesApi.list({
        page, limit: 12,
        search:     search     || undefined,
        category:   category   || undefined,
        difficulty: difficulty || undefined,
      })
      setCourses(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch { setCourses([]) }
    setLoading(false)
  }, [page, search, category, difficulty])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  function clearFilters() { setSearch(''); setCategory(''); setDifficulty(''); setPage(1) }
  const hasFilters = search || category || difficulty

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-1">GIS Courses</h1>
          <p className="text-muted">{total} course{total !== 1 ? 's' : ''} available</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              className="input pl-9"
              placeholder="Search courses…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input sm:w-52"
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select
            className="input sm:w-40"
            value={difficulty}
            onChange={e => { setDifficulty(e.target.value); setPage(1) }}
            aria-label="Filter by level"
          >
            <option value="">All Levels</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost text-danger hover:bg-danger-bg text-sm">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Active chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {search     && <Badge variant="ring">"{search}"</Badge>}
            {category   && <Badge variant="ring">{category}</Badge>}
            {difficulty && <Badge variant="success">{DIFF_LABEL[difficulty]}</Badge>}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-surface-raised" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24 text-subtle">
            <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted">No courses found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {courses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              className="btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Previous
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
