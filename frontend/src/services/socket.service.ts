import { io, Socket } from 'socket.io-client'
import type { UserStatus } from './user.service'

interface StatusUpdateEvent {
  userId: string
  username: string
  status: UserStatus
  timestamp: string
}

type StatusUpdateCallback = (event: StatusUpdateEvent) => void

type FriendRequestReceived = {
  id: string
  sender: { id: string; username: string; avatar?: string | null }
  createdAt: string
}
type FriendRequestResponse = {
  id: string
  receiver: { id: string; username: string; avatar?: string | null }
  status: 'ACCEPTED' | 'DECLINED'
  updatedAt: string
}
type FriendRequestCallback = (event: FriendRequestReceived) => void
type FriendRequestResponseCallback = (event: FriendRequestResponse) => void

class SocketService {
  private socket: Socket | null = null
  private isConnected = false
  private statusUpdateCallbacks = new Set<StatusUpdateCallback>()
  private friendRequestCallbacks = new Set<FriendRequestCallback>()
  private friendRequestResponseCallbacks = new Set<FriendRequestResponseCallback>()

  connect(userId: string, username: string): void {
    if (this.socket?.connected) {
      return
    }

    if (this.socket) {
      this.socket.disconnect()
    }

    this.socket = io('http://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      this.isConnected = true
      this.socket?.emit('authenticate', { userId, username })
    })

    this.socket.on('disconnect', () => {
      this.isConnected = false
    })

    this.socket.on('connect_error', (error) => {
    })

    this.socket.on('user_status_changed', (data: StatusUpdateEvent) => {
      this.statusUpdateCallbacks.forEach(callback => callback(data))
    })

    this.socket.on('friend_request_received', (data: FriendRequestReceived) => {
      this.friendRequestCallbacks.forEach(callback => callback(data))
    })

    this.socket.on('friend_request_response', (data: FriendRequestResponse) => {
      this.friendRequestResponseCallbacks.forEach(callback => callback(data))
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  onStatusUpdate(callback: StatusUpdateCallback): () => void {
    this.statusUpdateCallbacks.add(callback)
    return () => {
      this.statusUpdateCallbacks.delete(callback)
    }
  }

  onFriendRequestReceived(callback: FriendRequestCallback): () => void {
    this.friendRequestCallbacks.add(callback)
    return () => {
      this.friendRequestCallbacks.delete(callback)
    }
  }

  onFriendRequestResponse(callback: FriendRequestResponseCallback): () => void {
    this.friendRequestResponseCallbacks.add(callback)
    return () => {
      this.friendRequestResponseCallbacks.delete(callback)
    }
  }

  updateStatus(status: UserStatus): void {
    if (this.socket?.connected) {
      this.socket.emit('update_status', { status })
    }
  }

  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }
}

export const socketService = new SocketService()


