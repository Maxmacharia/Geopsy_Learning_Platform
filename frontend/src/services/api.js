import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refresh }
          )
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register:  (data) => api.post('/auth/register', data),
  login:     (data) => api.post('/auth/login', data),
  me:        ()     => api.get('/auth/me'),
  googleUrl: ()     => `${api.defaults.baseURL}/auth/google`,
}

// ── Courses ───────────────────────────────────────────────────────────────
export const coursesApi = {
  list:           (params)             => api.get('/courses', { params }),
  get:            (slug)               => api.get(`/courses/${slug}`),
  categories:     ()                   => api.get('/courses/categories'),
  create:         (data)               => api.post('/courses', data),
  update:         (id, data)           => api.patch(`/courses/${id}`, data),
  delete:         (id)                 => api.delete(`/courses/${id}`),
  addModule:      (courseId, data)     => api.post(`/courses/${courseId}/modules`, data),
  addLesson:      (moduleId, data)     => api.post(`/courses/modules/${moduleId}/lessons`, data),
  getLesson:      (id)                 => api.get(`/courses/lessons/${id}`),
  updateLesson:   (id, data)           => api.patch(`/courses/lessons/${id}`, data),
  updateProgress: (lessonId, percent)  => api.patch(`/courses/lessons/${lessonId}/progress`, null, { params: { percent } }),
}

// ── Forums ────────────────────────────────────────────────────────────────
export const forumsApi = {
  list:          ()                    => api.get('/forums'),
  createForum:   (data)                => api.post('/forums', data),
  posts:         (forumId, params)     => api.get(`/forums/${forumId}/posts`, { params }),
  post:          (postId)              => api.get(`/forums/posts/${postId}`),
  createPost:    (forumId, data)       => api.post(`/forums/${forumId}/posts`, data),
  comment:       (postId, data)        => api.post(`/forums/posts/${postId}/comments`, data),
  pin:           (postId)              => api.patch(`/forums/posts/${postId}/pin`),
  deletePost:    (postId)              => api.delete(`/forums/posts/${postId}`),
  deleteComment: (commentId)           => api.delete(`/forums/comments/${commentId}`),  // ADDED
}

// ── Users / Student ───────────────────────────────────────────────────────
export const usersApi = {
  bookmarks:       ()           => api.get('/users/me/bookmarks'),
  addBookmark:     (courseId)   => api.post(`/users/me/bookmarks/${courseId}`),
  removeBookmark:  (courseId)   => api.delete(`/users/me/bookmarks/${courseId}`),
  progress:        ()           => api.get('/users/me/progress'),
  updateProfile:   (data)       => api.patch('/users/me', null, { params: data }),
}

// ── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi_1 = {
  overview: () => api.get('/analytics/overview'),
}

// ── Resources ─────────────────────────────────────────────────────────────
export const resourcesApi = {
  upload:   (formData)     => api.post('/resources/upload', formData, {
                               headers: { 'Content-Type': 'multipart/form-data' }
                             }),
  addLink:  (params)       => api.post('/resources/link', null, { params }),
  download: (id)           => api.get(`/resources/${id}/download`),
  delete:   (id)           => api.delete(`/resources/${id}`),
}

// ── Maps ──────────────────────────────────────────────────────────────────
export const mapsApi = {
  get:    (mapId)    => api.get(`/maps/${mapId}`),
  create: (params)   => api.post('/maps', null, { params }),
  delete: (mapId)    => api.delete(`/maps/${mapId}`),
}

// ── Quizzes (admin) ───────────────────────────────────────────────────────
export const quizzesApi = {
  list:        (params)            => api.get('/quizzes', { params }),
  get:         (id)                => api.get(`/quizzes/${id}`),
  create:      (data)              => api.post('/quizzes', data),
  update:      (id, data)          => api.patch(`/quizzes/${id}`, data),
  delete:      (id)                => api.delete(`/quizzes/${id}`),
  publish:     (id)                => api.patch(`/quizzes/${id}/publish`),
  unpublish:   (id)                => api.patch(`/quizzes/${id}/unpublish`),
  archive:     (id)                => api.patch(`/quizzes/${id}/archive`),
  duplicate:   (id, data)          => api.post(`/quizzes/${id}/duplicate`, data),
  listAttempts:(id)                => api.get(`/quizzes/${id}/attempts`),
  addQuestion: (quizId, data)      => api.post(`/quizzes/${quizId}/questions`, data),
  updateQuestion: (qId, data)      => api.patch(`/quizzes/questions/${qId}`, data),
  deleteQuestion: (qId)            => api.delete(`/quizzes/questions/${qId}`),
}

// ── Quiz attempts (learner) ────────────────────────────────────────────────
export const attemptsApi = {
  getCourseQuizzes: (courseId)           => api.get(`/quizzes?course_id=${courseId}&status=published`),
  preview:   (quizId)           => api.get(`/quiz-attempts/quiz/${quizId}/preview`),
  start:     (quizId)           => api.post(`/quiz-attempts/quiz/${quizId}/start`),
  submit:    (attemptId, data)  => api.post(`/quiz-attempts/${attemptId}/submit`, data),
  result:    (attemptId)        => api.get(`/quiz-attempts/${attemptId}/result`),
  myAttempts: ()                => api.get('/quiz-attempts/my-attempts'),
}

// ── Grading (admin) ────────────────────────────────────────────────────────
export const gradingApi = {
  queue:       ()                      => api.get('/grading/queue'),
  gradeResponse: (responseId, data)    => api.post(`/grading/responses/${responseId}/grade`, data),
  pendingCount:  (attemptId)           => api.get(`/grading/attempts/${attemptId}/pending-count`),
}

// ── Certificates ───────────────────────────────────────────────────────────
export const certificatesApi = {
  mine:         ()              => api.get('/certificates/me'),
  all:          ()              => api.get('/certificates'),
  verify:       (verificationId) => api.get(`/certificates/verify/${verificationId}`),
  revoke:       (certId)        => api.patch(`/certificates/${certId}/revoke`),
  templates:    ()              => api.get('/certificates/templates'),
  createTemplate: (data)        => api.post('/certificates/templates', data),
}

// ── Enrollment & Payment ───────────────────────────────────────────────────
export const enrollmentApi = {
  enroll:         (data)         => api.post('/enrollments', data),
  myEnrollments:  ()             => api.get('/enrollments/my'),
  checkAccess:    (courseId)     => api.get(`/enrollments/check/${courseId}`),
  markInProgress: (enrollmentId) => api.post(`/enrollments/${enrollmentId}/mark-in-progress`),
  allEnrollments: (params)       => api.get('/enrollments', { params }),
  grantRetake:    (enrollmentId) => api.patch(`/enrollments/${enrollmentId}/grant-retake`),
  payments:       (params)       => api.get('/enrollments/payments', { params }),
}

// ── Extended course CRUD ─────────────────────────────────────────────────────
export const extCoursesApi = {
  getById:        (id)             => api.get(`/courses/${id}/full`),
  update:         (id, data)       => api.patch(`/courses/${id}`, data),
  updateModule:   (id, data)       => api.patch(`/courses/modules/${id}`, data),
  deleteModule:   (id)             => api.delete(`/courses/modules/${id}`),
  reorderModules: (courseId, ids)  => api.post(`/courses/modules/reorder?course_id=${courseId}`, ids),
  addLesson:      (moduleId, data) => api.post(`/courses/modules/${moduleId}/lessons`, data),
  updateLesson:   (id, data)       => api.patch(`/courses/lessons/${id}`, data),
  deleteLesson:   (id)             => api.delete(`/courses/lessons/${id}`),
  reorderLessons: (moduleId, ids)  => api.post(`/courses/modules/${moduleId}/lessons/reorder`, ids),
}

// ── Comprehensive Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  overview:      ()            => api.get('/analytics/overview'),
  courses:       ()            => api.get('/analytics/courses'),
  students:      (params)      => api.get('/analytics/students', { params }),
  studentDetail: (id)          => api.get(`/analytics/students/${id}`),
  quizHistory:   (id)          => api.get(`/analytics/students/${id}/quiz-history`),
  institutions:  ()            => api.get('/analytics/institutions'),
  certificates:  ()            => api.get('/analytics/certificates'),
  payments:      (params)      => api.get('/analytics/payments', { params }),
  recentActivity:(params)      => api.get('/analytics/recent-activity', { params }),
  trends:        (params)      => api.get('/analytics/trends', { params }),
  resources:     (params)      => api.get('/analytics/resources', { params }),
}
