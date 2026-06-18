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
export const analyticsApi = {
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
  create: (params)   => api.post('/maps', null, { params }),   // lesson_id, title, center_lat, center_lng, zoom_level
  delete: (mapId)    => api.delete(`/maps/${mapId}`),
}
