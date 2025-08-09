import { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { authService } from '../services/auth.service'

interface FailedRequest {
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}

let isRefreshing = false
let failedRequestsQueue: FailedRequest[] = []

export function setupInterceptors(axiosInstance: AxiosInstance) {
  axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = authService.getAccessToken()
      
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/refresh']
      const isPublicRoute = publicRoutes.some(route => config.url?.includes(route))
      
      if (token && !isPublicRoute) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
      
      const publicRoutes = ['/auth/login', '/auth/register', '/auth/refresh']
      const isPublicRoute = publicRoutes.some(route => originalRequest?.url?.includes(route))
      
      if (isPublicRoute) {
        return Promise.reject(error)
      }
      
      if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
        return Promise.reject(error)
      }

      if (originalRequest.url?.includes('/auth/refresh')) {
        authService.clearTokens()
        window.location.href = '/sign-in'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject })
        }).then(() => {
          const token = authService.getAccessToken()
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return axiosInstance(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await authService.refreshAccessToken()
        
        const newToken = authService.getAccessToken()
        
        failedRequestsQueue.forEach(request => request.resolve())
        failedRequestsQueue = []
        
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        failedRequestsQueue.forEach(request => request.reject(refreshError))
        failedRequestsQueue = []
        
        authService.clearTokens()
        window.location.href = '/sign-in'
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
  )
}
