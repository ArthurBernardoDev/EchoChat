import { api } from '../lib/api'

export interface Room {
  id: string
  name: string
  description: string | null
  avatar: string | null
  isPrivate: boolean
  isDirect: boolean
  maxMembers: number
  createdAt: string
  updatedAt: string
  userRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt: string
  users: RoomMember[]
  _count: {
    users: number
    messages: number
  }
}

export interface RoomMember {
  id: string
  userId: string
  roomId: string
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  nickname: string | null
  joinedAt: string
  mutedUntil: string | null
  user: {
    id: string
    username: string
    avatar: string | null
    status: 'ONLINE' | 'IDLE' | 'DO_NOT_DISTURB' | 'OFFLINE'
    lastSeen?: string
  }
}

export interface CreateRoomData {
  name: string
  description?: string
  avatar?: string
  isPrivate?: boolean
  maxMembers?: number
}

export interface UpdateRoomData {
  name?: string
  description?: string
  avatar?: string
  isPrivate?: boolean
  maxMembers?: number
}

export interface PublicRoom {
  id: string
  name: string
  description: string | null
  avatar: string | null
  isPrivate: boolean
  isDirect: boolean
  maxMembers: number
  memberCount: number
  messageCount: number
  isMember: boolean
  createdAt: string
  updatedAt: string
}

class RoomsService {
  async getUserRooms(): Promise<Room[]> {
    const response = await api.get<Room[]>('/rooms')
    return response.data
  }

  async searchPublicRooms(query: string): Promise<PublicRoom[]> {
    const response = await api.get<PublicRoom[]>(`/rooms/search/public?q=${encodeURIComponent(query)}`)
    return response.data
  }

  async getRoom(roomId: string): Promise<Room> {
    const response = await api.get<Room>(`/rooms/${roomId}`)
    return response.data
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    const response = await api.post<Room>('/rooms', data)
    return response.data
  }

  async updateRoom(roomId: string, data: UpdateRoomData): Promise<Room> {
    const response = await api.patch<Room>(`/rooms/${roomId}`, data)
    return response.data
  }

  async deleteRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}`)
  }

  async inviteUser(roomId: string, username: string): Promise<RoomMember> {
    const response = await api.post<RoomMember>(`/rooms/${roomId}/invite`, { username })
    return response.data
  }

  async listMembers(roomId: string): Promise<RoomMember[]> {
    const response = await api.get<RoomMember[]>(`/rooms/${roomId}/members`)
    return response.data
  }

  async update(roomId: string, data: Partial<UpdateRoomData>): Promise<Room> {
    const response = await api.patch<Room>(`/rooms/${roomId}`, data)
    return response.data
  }

  async mute(roomId: string, userId: string, minutes: number) {
    const response = await api.patch(`/rooms/${roomId}/members/${userId}/mute`, { minutes })
    return response.data
  }

  async ban(roomId: string, userId: string, reason?: string) {
    const response = await api.post(`/rooms/${roomId}/members/${userId}/ban`, { reason })
    return response.data
  }

  async unban(roomId: string, userId: string) {
    const response = await api.delete(`/rooms/${roomId}/members/${userId}/ban`)
    return response.data
  }

  async joinRoom(roomId: string): Promise<RoomMember> {
    const response = await api.post<RoomMember>(`/rooms/${roomId}/join`)
    return response.data
  }

  async leaveRoom(roomId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}/leave`)
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await api.delete(`/rooms/${roomId}/members/${userId}`)
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const response = await api.get<RoomMember[]>(`/rooms/${roomId}/members`)
    return response.data
  }

  async updateMemberRole(
    roomId: string, 
    userId: string, 
    role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  ): Promise<RoomMember> {
    const response = await api.patch<RoomMember>(`/rooms/${roomId}/members/${userId}/role`, { role })
    return response.data
  }

  async createDirectMessage(friendId: string): Promise<Room> {
    const directRoom = await this.createRoom({
      name: 'Direct Message',
      isPrivate: true,
      maxMembers: 2,
    })

    await this.inviteUser(directRoom.id, friendId)
    
    return directRoom
  }
}

export const roomsService = new RoomsService()
