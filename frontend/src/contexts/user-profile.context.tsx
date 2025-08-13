import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from './auth.context'
import { userService, UserProfile, UserStatus, UpdateProfileData } from '../services/user.service'
import { useChat } from './chat.context'

interface UserProfileContextData {
  profile: UserProfile | null
  isLoading: boolean
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  updateStatus: (status: UserStatus) => Promise<void>
  updateAvatar: (avatar: string | null) => Promise<void>
  reloadProfile: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextData>({} as UserProfileContextData)

interface UserProfileProviderProps {
  children: ReactNode
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
  const { user } = useAuth()
  const { onStatusUpdate, updateStatus: chatUpdateStatus } = useChat()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const profileData = await userService.getProfile()
      setProfile(profileData)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (user && profile && onStatusUpdate && typeof onStatusUpdate === 'function') {
      const unsubscribe = onStatusUpdate((event) => {
        if (event.userId === profile.id) {
          setProfile(prev => prev ? { ...prev, status: event.status } : null)
        }
      })

      return unsubscribe
    }
  }, [user, profile, onStatusUpdate])

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const updateData: UpdateProfileData = {
      email: data.email,
      username: data.username,
      bio: data.bio,
      avatar: data.avatar,
    }
    const updatedProfile = await userService.updateProfile(updateData)
    setProfile(updatedProfile)
  }, [])

  const updateStatus = useCallback(async (status: UserStatus) => {
    const updatedProfile = await userService.updateStatus(status)
    setProfile(updatedProfile)
    
    chatUpdateStatus(status)
  }, [chatUpdateStatus])

  const updateAvatar = useCallback(async (avatar: string | null) => {
    const updatedProfile = await userService.updateAvatar(avatar)
    setProfile(updatedProfile)
  }, [])

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        isLoading,
        updateProfile,
        updateStatus,
        updateAvatar,
        reloadProfile: loadProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (!context) {
    throw new Error('useUserProfile deve ser usado dentro de um UserProfileProvider')
  }
  return context
}
