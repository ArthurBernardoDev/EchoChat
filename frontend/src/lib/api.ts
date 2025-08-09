import axios from 'axios'
import { setupInterceptors } from './axios-interceptors'

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1'

const baseURL: string =
  (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) ||
  DEFAULT_BASE_URL

export const api = axios.create({ baseURL, withCredentials: true })

setupInterceptors(api)



