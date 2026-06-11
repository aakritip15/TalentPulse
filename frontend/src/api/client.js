import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const login = (email, password) =>
  api.post('/auth/login', new URLSearchParams({ username: email, password }))

export const register = (email, password) =>
  api.post('/auth/register', { email, password })

export const getMe = () => api.get('/auth/me')

export const getCandidates = (params) => api.get('/candidates', { params })

export const getCandidate = (id) => api.get(`/candidates/${id}`)

export const createCandidate = (data) => api.post('/candidates', data)

export const submitScore = (id, data) => api.post(`/candidates/${id}/scores`, data)

export const generateSummary = (id) => api.post(`/candidates/${id}/summary`)

export const updateNotes = (id, notes) => api.patch(`/candidates/${id}/notes`, { notes })

export const deleteCandidate = (id) => api.delete(`/candidates/${id}`)

export default api
