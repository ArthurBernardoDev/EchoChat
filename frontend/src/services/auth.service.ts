import { api } from '../lib/api'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface LoginCredentials {
  username: string
  password: string
}

interface RegisterData {
  email: string
  username: string
  password: string
}

class AuthService {
  private readonly ACCESS_TOKEN_KEY = '@EchoChat:accessToken'
  private readonly REFRESH_TOKEN_KEY = '@EchoChat:refreshToken'

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken)
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>('/auth/login', credentials)
    this.setTokens(response.data)
    return response.data
  }

  async register(data: RegisterData): Promise<void> {
    await api.post('/auth/register', data)
  }

  async refreshAccessToken(): Promise<AuthTokens | null> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return null
    }

    try {
      const response = await api.post<AuthTokens>('/auth/refresh', { refreshToken })
      this.setTokens(response.data)
      return response.data
    } catch (error) {
      this.clearTokens()
      throw error
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  }

  logout(): void {
    this.clearTokens()
  }
}

export const authService = new AuthService()
