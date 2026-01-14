import axios from 'axios'
import { useUserStore } from '@/store/user'

const request = axios.create({
  baseURL: '/api',
  timeout: 5000
})

request.interceptors.request.use(config => {
  const user = useUserStore()
  if (user.token) {
    config.headers['Authorization'] = 'Bearer ' + user.token
  }
  return config
})

request.interceptors.response.use(
  res => res.data,
  err => {
    console.error('API Error:', err)
    return Promise.reject(err)
  }
)

export default request
