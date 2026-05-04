import axios from 'axios'

const http = axios.create({
  timeout: 30000
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  config.headers = config.headers || {}
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const tenantId = localStorage.getItem('tenantId')
  if (tenantId) {
    config.headers.TenantID = tenantId
  }
  return config
})

export default http
