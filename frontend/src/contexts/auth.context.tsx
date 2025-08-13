import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authService } from '../services/auth.service'

interface User {
  id: string
  username: string
  email: string
}

interface AuthContextData {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  deleteAccount: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        if (authService.isAuthenticated()) {
          const userData = await authService.getCurrentUser()
          setUser(userData)
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error)
        authService.clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await authService.login({ username, password })
    const userData = await authService.getCurrentUser()
    setUser(userData)
  }, [])

  const register = useCallback(async (email: string, username: string, password: string) => {
    await authService.register({ email, username, password })
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    window.location.href = '/sign-in'
  }, [])

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount()
    setUser(null)
    window.location.href = '/sign-in'
  }, [])

  const refreshToken = useCallback(async () => {
    try {
      await authService.refreshAccessToken()
    } catch (error) {
      logout()
      throw error
    }
  }, [logout])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        deleteAccount,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
