import { api } from '../lib/api'

export type UserStatus = 'ONLINE' | 'IDLE' | 'DO_NOT_DISTURB' | 'OFFLINE'

export interface UserProfile {
  id: string
  email: string
  username: string
  bio: string | null
  avatar: string | null
  status: UserStatus
  createdAt: string
}

export interface UpdateProfileData {
  email?: string
  username?: string
  bio?: string | null
  avatar?: string | null
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

class UserService {
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/users/profile')
    return response.data
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put<UserProfile>('/users/profile', data)
    return response.data
  }

  async updateStatus(status: UserStatus): Promise<UserProfile> {
    const response = await api.patch<UserProfile>('/users/status', { status })
    return response.data
  }

  async updateAvatar(avatar: string | null): Promise<UserProfile> {
    const response = await api.patch<UserProfile>('/users/avatar', { avatar })
    return response.data
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await api.patch('/users/password', data)
  }
}

export const userService = new UserService()
