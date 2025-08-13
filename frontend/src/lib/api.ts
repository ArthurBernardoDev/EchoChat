import axios from 'axios'
import { setupInterceptors } from './axios-interceptors'

const DEFAULT_BASE_URL = (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:3000/api/v1'

const baseURL: string = DEFAULT_BASE_URL

export const api = axios.create({ baseURL, withCredentials: true })

setupInterceptors(api)



