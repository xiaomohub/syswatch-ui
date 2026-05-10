import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/store/user'

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

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      const path = router.currentRoute.value?.path || ''
      if (path !== '/login') {
        useUserStore().logout()
        router.replace({
          path: '/login',
          query: { redirect: router.currentRoute.value.fullPath }
        })
      }
    }
    return Promise.reject(error)
  }
)

export default http
