import { Link } from 'react-router-dom'
import { BookOpen, Layers } from 'lucide-react'
import Badge from '../ui/Badge'

const DIFF_VARIANT = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }
const DIFF_LABEL   = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

export default function CourseCard({ course }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="card flex flex-col overflow-hidden hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-150 group"
    >
      {/* Thumbnail */}
      {course.thumbnail_url ? (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-ink flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-surface/20" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {course.category && (
            <Badge variant="ring">{course.category}</Badge>
          )}
          <Badge variant={DIFF_VARIANT[course.difficulty] || 'neutral'}>
            {DIFF_LABEL[course.difficulty] || course.difficulty}
          </Badge>
        </div>

        <h3 className="font-semibold text-ink text-sm leading-snug line-clamp-2 group-hover:text-ring transition-colors">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs text-muted line-clamp-2 flex-1">{course.description}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-subtle mt-auto pt-2.5 border-t border-border">
          <Layers className="w-3 h-3 flex-shrink-0" />
          <span>{course.module_count} module{course.module_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Link>
  )
}
