import { api } from '../lib/api'

export interface Friend {
  friendshipId: string
  friend: {
    id: string
    username: string
    avatar: string | null
    status: 'ONLINE' | 'IDLE' | 'DO_NOT_DISTURB' | 'OFFLINE'
    lastSeen: string
  }
  since: string
}

export interface FriendRequest {
  id: string
  sender: {
    id: string
    username: string
    avatar: string | null
    status: 'ONLINE' | 'IDLE' | 'DO_NOT_DISTURB' | 'OFFLINE'
  }
  createdAt: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
}

export interface UserSearchResult {
  id: string
  username: string
  email: string
  avatar: string | null
  status: 'ONLINE' | 'IDLE' | 'DO_NOT_DISTURB' | 'OFFLINE'
  friendshipStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED' | null
  isFriend: boolean
  hasPendingRequest: boolean
}

class FriendsService {
  async getFriends(): Promise<Friend[]> {
    const response = await api.get<Friend[]>('/friends')
    return response.data
  }

  async getFriendRequests(): Promise<FriendRequest[]> {
    const response = await api.get<FriendRequest[]>('/friends/requests')
    return response.data
  }

  async getSentFriendRequests(): Promise<FriendRequest[]> {
    const response = await api.get<FriendRequest[]>('/friends/sent-requests')
    return response.data
  }

  async sendFriendRequest(username: string): Promise<FriendRequest> {
    const response = await api.post<FriendRequest>('/friends/request', { username })
    return response.data
  }

  async acceptFriendRequest(requestId: string): Promise<FriendRequest> {
    const response = await api.patch<FriendRequest>(`/friends/request/${requestId}/accept`)
    return response.data
  }

  async declineFriendRequest(requestId: string): Promise<FriendRequest> {
    const response = await api.patch<FriendRequest>(`/friends/request/${requestId}/decline`)
    return response.data
  }

  async removeFriend(friendId: string): Promise<void> {
    await api.delete(`/friends/${friendId}`)
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (query.length < 2) return []
    const response = await api.get<UserSearchResult[]>(`/friends/search?q=${encodeURIComponent(query)}`)
    return response.data
  }

  async getOnlineFriends(): Promise<Friend[]> {
    const response = await api.get<Friend[]>('/friends/online')
    return response.data
  }
}

export const friendsService = new FriendsService()
