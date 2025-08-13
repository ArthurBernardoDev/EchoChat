import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { useAuth } from './auth.context'
import { io, Socket } from 'socket.io-client'
import { useThrottle } from '../hooks/use-throttle'
import { api } from '../lib/api'
import { authService } from '../services/auth.service'
import { UserStatus } from '../services/user.service'
import { chatService, UnreadSummary } from '../services/chat.service'

export interface ChatMessage {
  id: string
  content: string
  edited: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
  userId: string
  roomId: string
  replyToId?: string
  user: {
    id: string
    username: string
    avatar?: string
    status: string
  }
  replyTo?: {
    id: string
    content: string
    user: {
      id: string
      username: string
      avatar?: string
    }
  }
  reactions: Array<{
    id: string
    emoji: string
    user: {
      id: string
      username: string
    }
  }>
  _count: {
    reactions: number
    replies: number
  }
  tempId?: string
  pending?: boolean
}

export interface ChatRoom {
  id: string
  name: string
  description?: string
  avatar?: string
  isPrivate: boolean
  isDirect: boolean
  messages: ChatMessage[]
  unreadCount: number
  isLoading: boolean
  hasMore: boolean
  typingUsers: string[]
}

interface StatusUpdateEvent {
  userId: string
  username: string
  status: UserStatus
  timestamp: string
}

interface FriendRequestReceived {
  id: string
  sender: { id: string; username: string; avatar?: string | null }
  createdAt: string
}

interface FriendRequestResponse {
  id: string
  receiver: { id: string; username: string; avatar?: string | null }
  status: 'ACCEPTED' | 'DECLINED'
  updatedAt: string
}

type StatusUpdateCallback = (event: StatusUpdateEvent) => void
type FriendRequestCallback = (event: FriendRequestReceived) => void
type FriendRequestResponseCallback = (event: FriendRequestResponse) => void
type FriendRemovedCallback = (event: { removedById: string; timestamp: string }) => void

interface ChatContextData {
  rooms: Map<string, ChatRoom>
  activeRoomId: string | null
  isConnected: boolean
  unreadSummary: UnreadSummary | null
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: (roomId: string) => void
  sendMessage: (roomId: string, content: string, replyToId?: string) => Promise<void>
  loadMessages: (roomId: string, before?: string) => Promise<void>
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  markAsRead: (messageId: string) => void
  markRoomAsRead: (roomId: string) => void
  startTyping: (roomId: string) => void
  stopTyping: (roomId: string) => void
  getOrCreateDM: (friendId: string) => Promise<string>

  updateStatus: (status: UserStatus) => void
  onStatusUpdate: (callback: StatusUpdateCallback) => () => void
  onFriendRequestReceived: (callback: FriendRequestCallback) => () => void
  onFriendRequestResponse: (callback: FriendRequestResponseCallback) => () => void
  onFriendRemoved: (callback: FriendRemovedCallback) => () => void
}

const ChatContext = createContext<ChatContextData>({} as ChatContextData)

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<Map<string, ChatRoom>>(new Map())
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [unreadSummary, setUnreadSummary] = useState<UnreadSummary | null>(null)
  
  const reloadUnreadSummary = async () => {
    try {
      const summary = await chatService.getUnreadSummary()
      setUnreadSummary(summary)
    } catch (error) {
      console.error('Error loading unread summary:', error)
    }
  }
  const activeRoomIdRef = useRef<string | null>(null)
  
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pendingJoinsRef = useRef<Set<string>>(new Set())
  
  const statusUpdateCallbacks = useRef(new Set<StatusUpdateCallback>())
  const friendRequestCallbacks = useRef(new Set<FriendRequestCallback>())
  const friendRequestResponseCallbacks = useRef(new Set<FriendRequestResponseCallback>())
  const friendRemovedCallbacks = useRef(new Set<FriendRemovedCallback>())

  useEffect(() => {
    if (!user) return

    let token = authService.getAccessToken()
    const ensureToken = async () => {
      if (!token) {
        try {
          const refreshed = await authService.refreshAccessToken()
          token = refreshed?.accessToken || authService.getAccessToken()
        } catch {}
      }
      return token
    }

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    } catch {}
    
    const socket = io('http://localhost:3000/chat', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', async () => {
      const validToken = await ensureToken()
      if (validToken) {
        socket.emit('authenticate', { token: validToken })
      } else {
      }
    })

    socket.on('authenticated', () => {
      setIsConnected(true)
      reloadUnreadSummary()
      if (pendingJoinsRef.current.size > 0) {
        pendingJoinsRef.current.forEach((rid) => {
          socket.emit('join_room', { roomId: rid })
        })
        pendingJoinsRef.current.clear()
      }
    })

    socket.on('authentication_error', async (error) => {
      try {
        const refreshed = await authService.refreshAccessToken()
        const newToken = refreshed?.accessToken || authService.getAccessToken()
        if (newToken) {
          socket.emit('authenticate', { token: newToken })
          return
        }
      } catch {}
      toast.error('Falha na autenticação do chat')
      setIsConnected(false)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('error', (payload: any) => {
      const message = payload?.message || 'Erro no chat'
      toast.error(message)
    })

    socket.on('new_message', (message: ChatMessage) => {
      reloadUnreadSummary()
      
      setRooms(prevRooms => {
        const newRooms = new Map(prevRooms)
        const room = newRooms.get(message.roomId)
        
        if (room) {
          // Verificar se é uma mensagem otimista que precisa ser substituída
          const existingMessageIndex = room.messages.findIndex(m => m.tempId === message.tempId)
          
          let updatedMessages
          if (existingMessageIndex !== -1 && message.tempId) {
            // Substituir mensagem otimista pela mensagem real
            updatedMessages = [...room.messages]
            updatedMessages[existingMessageIndex] = message
          } else {
            // Adicionar nova mensagem
            updatedMessages = [...room.messages, message]
          }
          
          const updatedRoom = {
            ...room,
            messages: updatedMessages,
            unreadCount:
              message.userId !== user.id && activeRoomIdRef.current !== message.roomId
                ? room.unreadCount + 1
                : room.unreadCount,
          }
          newRooms.set(message.roomId, updatedRoom)
        }
        
        return newRooms
      })

      try {
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          message.userId !== user.id &&
          activeRoomIdRef.current !== message.roomId
        ) {
          const title = 'Nova mensagem'
          const body = `${message.user.username}: ${message.content}`
          new Notification(title, { body })
        }
      } catch {}
    })

    socket.on('user_typing', (data: { userId: string; username: string; roomId: string; isTyping: boolean }) => {
      if (data.userId === user.id) return
      
      setRooms(prevRooms => {
        const newRooms = new Map(prevRooms)
        const room = newRooms.get(data.roomId)
        
        if (room) {
          let typingUsers = [...room.typingUsers]
          
          if (data.isTyping) {
            if (!typingUsers.includes(data.username)) {
              typingUsers.push(data.username)
            }
          } else {
            typingUsers = typingUsers.filter(u => u !== data.username)
          }
          
          const updatedRoom = { ...room, typingUsers }
          newRooms.set(data.roomId, updatedRoom)
        }
        
        return newRooms
      })
    })

    socket.on('user_status_changed', (data: StatusUpdateEvent) => {
      statusUpdateCallbacks.current.forEach(callback => {
        callback(data)
      })
    })

    socket.on('friend_request_received', (data: FriendRequestReceived) => {
      friendRequestCallbacks.current.forEach(callback => callback(data))
      reloadUnreadSummary()
    })

    socket.on('friend_request_response', (data: FriendRequestResponse) => {
      friendRequestResponseCallbacks.current.forEach(callback => callback(data))
      reloadUnreadSummary()
    })

    socket.on('friend_removed', (data: { removedById: string; timestamp: string }) => {
      friendRemovedCallbacks.current.forEach(callback => callback(data))
      reloadUnreadSummary()
    })

    socket.on('message_read', async (data: { messageId: string; userId: string; username: string; readAt: string }) => {
      if (data.userId === user.id) {
        await reloadUnreadSummary()
      }
    })

    socket.on('message_edited', (message: ChatMessage) => {
      setRooms(prevRooms => {
        const newRooms = new Map(prevRooms)
        const room = newRooms.get(message.roomId)
        
        if (room) {
          const updatedMessages = room.messages.map(m => 
            m.id === message.id ? message : m
          )
          const updatedRoom = { ...room, messages: updatedMessages }
          newRooms.set(message.roomId, updatedRoom)
        }
        
        return newRooms
      })
    })

    socket.on('message_deleted', (data: { messageId: string; roomId: string }) => {
      setRooms(prevRooms => {
        const newRooms = new Map(prevRooms)
        const room = newRooms.get(data.roomId)
        
        if (room) {
          const updatedMessages = room.messages.map(m => 
            m.id === data.messageId 
              ? { ...m, deleted: true, content: '[Mensagem deletada]' }
              : m
          )
          const updatedRoom = { ...room, messages: updatedMessages }
          newRooms.set(data.roomId, updatedRoom)
        }
        
        return newRooms
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      activeRoomIdRef.current = null
    }
  }, [user])

  const joinRoom = useCallback(async (roomId: string) => {
    console.log('🔄 joinRoom chamado para roomId:', roomId)
    console.log('🔌 Socket conectado:', socketRef.current?.connected)
    
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms)
      if (!newRooms.has(roomId)) {
        console.log('➕ Criando nova sala no estado:', roomId)
        newRooms.set(roomId, {
          id: roomId,
          name: '',
          isPrivate: false,
          isDirect: false,
          messages: [],
          unreadCount: 0,
          isLoading: true,
          hasMore: true,
          typingUsers: [],
        })
      } else {
        console.log('✅ Sala já existe no estado:', roomId)
      }
      return newRooms
    })

    if (socketRef.current?.connected) {
      console.log('📡 Enviando join_room via WebSocket:', roomId)
      socketRef.current.emit('join_room', { roomId })
    } else {
      console.log('⏳ Socket não conectado, adicionando à fila de espera:', roomId)
      pendingJoinsRef.current.add(roomId)
    }
    setActiveRoomId(roomId)
    activeRoomIdRef.current = roomId

    setRooms(prev => {
      const next = new Map(prev)
      const r = next.get(roomId)
      if (r) next.set(roomId, { ...r, unreadCount: 0 })
      return next
    })
    
    reloadUnreadSummary()

    console.log('📥 Carregando mensagens para:', roomId)
    await loadMessages(roomId)
    console.log('✅ Mensagens carregadas para:', roomId)
    
    setTimeout(async () => {
      await markRoomAsRead(roomId)
    }, 1000)
  }, [])

  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return

    socketRef.current.emit('leave_room', { roomId })
    
    if (activeRoomId === roomId) {
      setActiveRoomId(null)
    }
  }, [activeRoomId])

  const sendMessage = useCallback(async (roomId: string, content: string, replyToId?: string) => {
    if (!content || content.trim().length === 0) {
      toast.error('Mensagem vazia')
      return
    }
    if (!socketRef.current?.connected) {
      toast.error('Não foi possível enviar: desconectado do chat')
      return
    }

    socketRef.current.emit('send_message', { roomId, content, replyToId })
  }, [])

  const loadMessages = useCallback(async (roomId: string, before?: string) => {
    console.log('📥 loadMessages chamado para roomId:', roomId, 'before:', before)
    try {
      const params: any = { limit: 50 }
      if (before) params.before = before

      console.log('🌐 Fazendo requisição para:', `/chat/rooms/${roomId}/messages`)
      const { data } = await api.get(`/chat/rooms/${roomId}/messages`, { params })
      console.log('📨 Resposta recebida:', data)
      
      setRooms(prevRooms => {
        const newRooms = new Map(prevRooms)
        const room = newRooms.get(roomId)
        
        if (room) {
          const updatedRoom = {
            ...room,
            messages: before 
              ? [...data.messages, ...room.messages]
              : data.messages,
            isLoading: false,
            hasMore: data.hasMore,
          }
          newRooms.set(roomId, updatedRoom)
        }
        
        return newRooms
      })
    } catch (error: any) {
      console.error('Erro ao carregar mensagens:', error)
      
      if (error.response?.status === 403) {
        console.warn(`Usuário não tem acesso à sala ${roomId}`)
        setRooms(prevRooms => {
          const newRooms = new Map(prevRooms)
          newRooms.delete(roomId)
          return newRooms
        })
      }
    }
  }, [])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await api.put(`/chat/messages/${messageId}`, { content })
    } catch (error) {
      console.error('Erro ao editar mensagem:', error)
    }
  }, [])

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await api.delete(`/chat/messages/${messageId}`)
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error)
    }
  }, [])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await api.post(`/chat/messages/${messageId}/reactions`, { emoji })
    } catch (error) {
      console.error('Erro ao adicionar reação:', error)
    }
  }, [])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await api.delete(`/chat/messages/${messageId}/reactions/${emoji}`)
    } catch (error) {
      console.error('Erro ao remover reação:', error)
    }
  }, [])

  const markAsRead = useCallback((messageId: string) => {
    if (!socketRef.current?.connected) return
    socketRef.current.emit('mark_as_read', { messageId })
    setTimeout(async () => {
      await reloadUnreadSummary()
    }, 500)
  }, [])

  const markRoomAsRead = useCallback(async (roomId: string) => {
    try {
      await chatService.markAllRoomAsRead(roomId)
      setRooms(prev => {
        const next = new Map(prev)
        const room = next.get(roomId)
        if (room) {
          next.set(roomId, { ...room, unreadCount: 0 })
        }
        return next
      })
      await reloadUnreadSummary()
    } catch (error) {
      console.error('Error marking room as read:', error)
    }
  }, [])

  const startTyping = useThrottle(useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('typing_start', { roomId })
    
    const timeouts = typingTimeoutsRef.current
    if (timeouts.has(roomId)) {
      clearTimeout(timeouts.get(roomId)!)
    }
    
    const timeout = setTimeout(() => {
      stopTyping(roomId)
    }, 3000)
    
    timeouts.set(roomId, timeout)
  }, []), 1000)

  const stopTyping = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) return
    
    socketRef.current.emit('typing_stop', { roomId })
    
    const timeouts = typingTimeoutsRef.current
    if (timeouts.has(roomId)) {
      clearTimeout(timeouts.get(roomId)!)
      timeouts.delete(roomId)
    }
  }, [])

  const getOrCreateDM = useCallback(async (friendId: string): Promise<string> => {
    try {
      const { data } = await api.post(`/chat/dm/${friendId}`)
      return data.id
    } catch (error) {
      console.error('Erro ao criar DM:', error)
      throw error
    }
  }, [])



  const updateStatus = useCallback((status: UserStatus) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_status', { status })
    }
  }, [])

  const onStatusUpdate = useCallback((callback: StatusUpdateCallback) => {
    statusUpdateCallbacks.current.add(callback)
      
    return () => {
      statusUpdateCallbacks.current.delete(callback)
    }
  }, [])

  const onFriendRequestReceived = useCallback((callback: FriendRequestCallback) => {
    friendRequestCallbacks.current.add(callback)
    return () => {
      friendRequestCallbacks.current.delete(callback)
    }
  }, [])

  const onFriendRequestResponse = useCallback((callback: FriendRequestResponseCallback) => {
    friendRequestResponseCallbacks.current.add(callback)
    return () => {
      friendRequestResponseCallbacks.current.delete(callback)
    }
  }, [])

  const onFriendRemoved = useCallback((callback: FriendRemovedCallback) => {
    friendRemovedCallbacks.current.add(callback)
    return () => {
      friendRemovedCallbacks.current.delete(callback)
    }
  }, [])

  const contextValue = useMemo(
    () => ({
      rooms,
      activeRoomId,
      isConnected,
      unreadSummary,
      joinRoom,
      leaveRoom,
      sendMessage,
      loadMessages,
      editMessage,
      deleteMessage,
      addReaction,
      removeReaction,
      markAsRead,
      markRoomAsRead,
      startTyping,
      stopTyping,
      getOrCreateDM,
      updateStatus,
      onStatusUpdate,
      onFriendRequestReceived,
      onFriendRequestResponse,
      onFriendRemoved,
    }),
    [
      rooms,
      activeRoomId,
      isConnected,
      unreadSummary,
      joinRoom,
      leaveRoom,
      sendMessage,
      loadMessages,
      editMessage,
      deleteMessage,
      addReaction,
      removeReaction,
      markAsRead,
      markRoomAsRead,
      startTyping,
      stopTyping,
      getOrCreateDM,
      updateStatus,
      onStatusUpdate,
      onFriendRequestReceived,
      onFriendRequestResponse,
      onFriendRemoved,
    ]
  )

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat deve ser usado dentro de um ChatProvider')
  }
  return context
}
