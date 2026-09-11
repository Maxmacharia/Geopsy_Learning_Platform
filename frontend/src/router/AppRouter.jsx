import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import PageSpinner from '../components/ui/PageSpinner'

// Public
const Home              = lazy(() => import('../pages/public/Home'))
const About             = lazy(() => import('../pages/public/About'))
const Courses           = lazy(() => import('../pages/public/Courses'))
const CourseDetail      = lazy(() => import('../pages/public/CourseDetail'))
const LessonView        = lazy(() => import('../pages/public/LessonView'))
const Forums            = lazy(() => import('../pages/public/Forums'))
const ForumPostList     = lazy(() => import('../pages/public/ForumPostList'))
const ForumThread       = lazy(() => import('../pages/public/ForumThread'))
const Contact           = lazy(() => import('../pages/public/Contact'))
const VerifyCertificate = lazy(() => import('../pages/public/VerifyCertificate'))

// Auth
const Login    = lazy(() => import('../pages/auth/Login'))
const Register = lazy(() => import('../pages/auth/Register'))

// Student
const Dashboard    = lazy(() => import('../pages/student/Dashboard'))
const Profile      = lazy(() => import('../pages/student/Profile'))
const Bookmarks    = lazy(() => import('../pages/student/Bookmarks'))
const Progress     = lazy(() => import('../pages/student/Progress'))
const TakeQuiz     = lazy(() => import('../pages/student/TakeQuiz'))
const MyQuizzes    = lazy(() => import('../pages/student/MyQuizzes'))
const CourseEnroll = lazy(() => import('../pages/student/CourseEnroll'))

// Admin
const AdminDashboard   = lazy(() => import('../pages/admin/AdminDashboard'))
const AdminCourses     = lazy(() => import('../pages/admin/AdminCourses'))
const AdminCourseEdit  = lazy(() => import('../pages/admin/AdminCourseEdit'))
const AdminUpload      = lazy(() => import('../pages/admin/AdminUpload'))
const AdminForums      = lazy(() => import('../pages/admin/AdminForums'))
const AdminAnalytics   = lazy(() => import('../pages/admin/AdminAnalytics'))
const AdminMaps        = lazy(() => import('../pages/admin/AdminMaps'))
const AdminQuizzes     = lazy(() => import('../pages/admin/AdminQuizzes'))
const AdminQuizEdit    = lazy(() => import('../pages/admin/AdminQuizEdit'))
const AdminGradingQueue = lazy(() => import('../pages/admin/AdminGradingQueue'))

function RequireAuth({ children }) {
  const user    = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading) return <PageSpinner />
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const user    = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading)            return <PageSpinner />
  if (!user)              return <Navigate to="/login" replace />
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
        <Route path="/"                                  element={<Home />} />
        <Route path="/about"                             element={<About />} />
        <Route path="/courses"                           element={<Courses />} />
        <Route path="/courses/:slug"                     element={<CourseDetail />} />
        <Route path="/lessons/:id"                       element={<LessonView />} />
        <Route path="/forums"                            element={<Forums />} />
        <Route path="/forums/:forumId"                   element={<ForumPostList />} />
        <Route path="/forums/:forumId/posts/:postId"     element={<ForumThread />} />
        <Route path="/contact"                           element={<Contact />} />
        <Route path="/verify/:verificationId"            element={<VerifyCertificate />} />

        {/* Auth */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student */}
        <Route path="/dashboard"         element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/profile"           element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/bookmarks"         element={<RequireAuth><Bookmarks /></RequireAuth>} />
        <Route path="/progress"          element={<RequireAuth><Progress /></RequireAuth>} />
        <Route path="/my-quizzes"        element={<RequireAuth><MyQuizzes /></RequireAuth>} />
        <Route path="/quiz/:quizId"      element={<RequireAuth><TakeQuiz /></RequireAuth>} />
        <Route path="/enroll/:slug"      element={<RequireAuth><CourseEnroll /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin"                   element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/courses"           element={<RequireAdmin><AdminCourses /></RequireAdmin>} />
        <Route path="/admin/courses/:courseId" element={<RequireAdmin><AdminCourseEdit /></RequireAdmin>} />
        <Route path="/admin/upload"            element={<RequireAdmin><AdminUpload /></RequireAdmin>} />
        <Route path="/admin/forums"            element={<RequireAdmin><AdminForums /></RequireAdmin>} />
        <Route path="/admin/analytics"         element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
        <Route path="/admin/maps"              element={<RequireAdmin><AdminMaps /></RequireAdmin>} />
        <Route path="/admin/quizzes"           element={<RequireAdmin><AdminQuizzes /></RequireAdmin>} />
        <Route path="/admin/quizzes/:quizId"   element={<RequireAdmin><AdminQuizEdit /></RequireAdmin>} />
        <Route path="/admin/grading"           element={<RequireAdmin><AdminGradingQueue /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
