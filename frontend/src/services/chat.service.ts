import { api } from '../lib/api'

export interface UnreadSummary {
  rooms: Array<{
    roomId: string
    roomName: string
    isDirect: false
    unreadCount: number
  }>
  directMessages: Array<{
    roomId: string
    roomName: string
    isDirect: true
    unreadCount: number
    otherUser: {
      id: string
      username: string
      avatar: string | null
      status: string
    }
  }>
  totalUnread: number
}

class ChatService {
  async getUnreadSummary(): Promise<UnreadSummary> {
    const response = await api.get('/chat/unread-summary')
    return response.data
  }

  async getUnreadCount(roomId: string): Promise<number> {
    const response = await api.get(`/chat/rooms/${roomId}/unread-count`)
    return response.data.count
  }

  async markAsRead(messageId: string): Promise<void> {
    await api.post(`/chat/messages/${messageId}/read`)
  }

  async markAllRoomAsRead(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/read-all`)
  }
}

export const chatService = new ChatService()
