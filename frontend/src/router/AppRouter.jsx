import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import PageSpinner from '../components/ui/PageSpinner'

// Public pages
const Home           = lazy(() => import('../pages/public/Home'))
const About          = lazy(() => import('../pages/public/About'))
const Courses        = lazy(() => import('../pages/public/Courses'))
const CourseDetail   = lazy(() => import('../pages/public/CourseDetail'))
const LessonView     = lazy(() => import('../pages/public/LessonView'))
const Forums         = lazy(() => import('../pages/public/Forums'))
const ForumPostList  = lazy(() => import('../pages/public/ForumPostList'))   // NEW
const ForumThread    = lazy(() => import('../pages/public/ForumThread'))
const Contact        = lazy(() => import('../pages/public/Contact'))

// Auth pages
const Login    = lazy(() => import('../pages/auth/Login'))
const Register = lazy(() => import('../pages/auth/Register'))

// Student pages
const Dashboard = lazy(() => import('../pages/student/Dashboard'))
const Profile   = lazy(() => import('../pages/student/Profile'))
const Bookmarks = lazy(() => import('../pages/student/Bookmarks'))
const Progress  = lazy(() => import('../pages/student/Progress'))

// Admin pages
const AdminDashboard  = lazy(() => import('../pages/admin/AdminDashboard'))
const AdminCourses    = lazy(() => import('../pages/admin/AdminCourses'))
const AdminCourseEdit = lazy(() => import('../pages/admin/AdminCourseEdit'))
const AdminUpload     = lazy(() => import('../pages/admin/AdminUpload'))
const AdminForums     = lazy(() => import('../pages/admin/AdminForums'))
const AdminAnalytics  = lazy(() => import('../pages/admin/AdminAnalytics'))
const AdminMaps       = lazy(() => import('../pages/admin/AdminMaps'))       // NEW

function RequireAuth({ children }) {
  const user    = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const user    = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

export default function AppRouter() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [])

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<Home />} />
        <Route path="/about"         element={<About />} />
        <Route path="/courses"       element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetail />} />
        <Route path="/lessons/:id"   element={<LessonView />} />
        <Route path="/forums"                            element={<Forums />} />
        <Route path="/forums/:forumId"                   element={<ForumPostList />} />   {/* FIXED */}
        <Route path="/forums/:forumId/posts/:postId"     element={<ForumThread />} />
        <Route path="/contact"       element={<Contact />} />

        {/* Auth */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/profile"   element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
        <Route path="/progress"  element={<RequireAuth><Progress /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin"                   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
        <Route path="/admin/courses/:courseId" element={<RequireAdmin><AdminCourseEdit /></RequireAdmin>} />
        <Route path="/admin/upload"            element={<RequireAdmin><AdminUpload /></RequireAdmin>} />
        <Route path="/admin/forums"            element={<RequireAdmin><AdminForums /></RequireAdmin>} />
        <Route path="/admin/analytics"         element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
        <Route path="/admin/maps"              element={<RequireAdmin><AdminMaps /></RequireAdmin>} />   {/* NEW */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
