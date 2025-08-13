import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ChatService } from './chat.service'
import { MessageQueueService } from './message-queue.service'
import { RoomQueueService } from './room-queue.service'

import { UserStatus } from '@prisma/client'
import { RedisService } from '../redis/redis.service'
import { PrismaService } from '../prisma/prisma.service'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
}

interface SendMessageData {
  roomId: string
  content: string
  replyToId?: string
}

interface JoinRoomData {
  roomId: string
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ChatGateway.name)


  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private messageQueueService: MessageQueueService,
    private roomQueueService: RoomQueueService,
    private redisService: RedisService,
    private prismaService: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized')
    this.setupRedisSubscriptions()
  }


  private async setupRedisSubscriptions() {
    try {

      await this.redisService.subscribe('user_status_changed', (data) => {
        this.server.emit('user_status_changed', data)
      })


      await this.redisService.subscribe('new_message', (data) => {
        this.server.to(`room:${data.roomId}`).emit('new_message', data.message)
      })


      await this.redisService.subscribe('message_saved', (data) => {

        if (data.message && data.message.roomId) {
          this.server.to(`room:${data.message.roomId}`).emit('message_confirmed', {
            tempId: data.tempId,
            message: data.message
          })
        }
      })


      await this.redisService.subscribe('room_join_processed', (data) => {
        const socket = this.server.sockets.sockets.get(data.socketId)
        if (socket && data.success) {

          socket.join(`room:${data.roomId}`)
          socket.emit('room_joined', { roomId: data.roomId })
          

          socket.to(`room:${data.roomId}`).emit('user_joined_room', {
            userId: data.userId,
            roomId: data.roomId,
            timestamp: new Date(data.timestamp).toISOString(),
          })
        } else if (socket && !data.success) {
          socket.emit('error', { message: `Failed to join room: ${data.error}` })
        }
      })


      await this.redisService.subscribe('room_leave_processed', (data) => {
        const socket = this.server.sockets.sockets.get(data.socketId)
        if (socket && data.success) {

          this.logger.debug(`User ${data.userId} successfully left room ${data.roomId}`)
        } else if (socket && !data.success) {
          socket.emit('error', { message: `Failed to leave room: ${data.error}` })
        }
      })

      this.logger.log('Redis subscriptions configured')
    } catch (error) {
      this.logger.error('Failed to setup Redis subscriptions:', error)
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Chat client connected: ${client.id}`)
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Chat client disconnected: ${client.id}`)
    
    if (client.userId) {
      await this.redisService.removeConnectedUser(client.userId)
      
      try {
        const userRooms = await this.redisService.getUserRooms(client.userId)
        for (const roomId of userRooms) {
          client.leave(`room:${roomId}`)
        }
        await this.redisService.removeAllUserRooms(client.userId)
      } catch (error) {
        this.logger.error('Error handling disconnect cleanup:', error)
      }

      await this.redisService.publish('user_status_changed', {
        userId: client.userId,
        username: client.username,
        status: 'OFFLINE',
        timestamp: new Date().toISOString(),
      })
    }
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { token: string },
  ) {
    try {
      const payload = this.jwtService.verify(data.token)
      client.userId = payload.sub
      client.username = payload.username
      
      if (client.userId) {
        await this.redisService.setConnectedUser(client.userId, client.id)
      }
      this.logger.log(`Chat user authenticated: ${client.username} (${client.userId})`)
      
      await this.autoJoinUserRooms(client)
      
      client.join(`user_${client.userId}`)
      
      await this.redisService.publish('user_status_changed', {
        userId: client.userId,
        username: client.username,
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
      })
      
      client.emit('authenticated', { success: true })
    } catch (error) {
      this.logger.error('Chat authentication failed:', error.message)
      client.emit('authentication_error', { message: 'Invalid token' })
      client.disconnect()
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' })
      return
    }

    try {
      const isAlreadyInSocketRoom = this.isClientInSocketRoom(client, data.roomId)
      
      if (isAlreadyInSocketRoom) {
        client.emit('room_joined', { roomId: data.roomId })
        this.logger.log(`User ${client.username} already in room ${data.roomId}, confirming`)
        return
      }

      await this.roomQueueService.addJoinRoomRequest({
        userId: client.userId,
        roomId: data.roomId,
        username: client.username || 'unknown',
        socketId: client.id,
        timestamp: Date.now()
      })

      client.emit('room_join_queued', { 
        roomId: data.roomId,
        message: 'Join request queued for processing' 
      })

      this.logger.debug(`Join room request queued for user ${client.username} to room ${data.roomId}`)
    } catch (error) {
      this.logger.error('Error joining room:', error)
      client.emit('error', { message: 'Failed to join room' })
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinRoomData,
  ) {
    if (!client.userId) return

    try {
      client.leave(`room:${data.roomId}`)
      
      await this.roomQueueService.addLeaveRoomRequest({
        userId: client.userId,
        roomId: data.roomId,
        username: client.username || 'unknown',
        socketId: client.id,
        timestamp: Date.now()
      })

      client.emit('room_left', { roomId: data.roomId })
      
      client.to(`room:${data.roomId}`).emit('user_left_room', {
        userId: client.userId,
        username: client.username,
        roomId: data.roomId,
        timestamp: new Date().toISOString(),
      })

      this.logger.debug(`Leave room request queued for user ${client.username} from room ${data.roomId}`)
    } catch (error) {
      this.logger.error('Error leaving room:', error)
      client.emit('error', { message: 'Failed to leave room' })
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageData,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' })
      return
    }

    try {
      const isInSocketRoom = this.isClientInSocketRoom(client, data.roomId)
      
      if (!isInSocketRoom) {
        const isInRoom = await this.redisService.isUserInRoom(client.userId, data.roomId)
        
        if (!isInRoom) {
          const roomUser = await this.prismaService.roomUser.findUnique({
            where: { userId_roomId: { userId: client.userId, roomId: data.roomId } }
          })
          
          if (!roomUser) {
            client.emit('error', { message: 'Access denied to room' })
            return
          }
          
          await Promise.all([
            this.redisService.addUserToRoom(client.userId, data.roomId),
            client.join(`room:${data.roomId}`)
          ])
        }
      }

      const tempId = await this.messageQueueService.enqueueMessage({
        userId: client.userId,
        roomId: data.roomId,
        content: data.content,
        replyToId: data.replyToId,
      })

      const optimisticMessage = {
        id: tempId,
        userId: client.userId,
        roomId: data.roomId,
        content: data.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        edited: false,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        editHistory: [],
        metadata: null,
        replyToId: data.replyToId,
        replyTo: null,
        reactions: [],
        _count: {
          reactions: 0,
          replies: 0,
        },
        user: {
          id: client.userId,
          username: client.username,
          avatar: null,
          status: 'ONLINE',
        },
        tempId,
        pending: true 
      }

      if (this.server) {
        this.server.to(`room:${data.roomId}`).emit('new_message', optimisticMessage)

        const roomSize = this.server?.sockets?.adapter?.rooms?.get(`room:${data.roomId}`)?.size || 0
        this.logger.log(`Message sent in room ${data.roomId} by ${client.username} to ${roomSize} users`)
      } else {
        this.logger.warn('Server not initialized, cannot emit message')
      }
    } catch (error: any) {
      this.logger.error('Error sending message:', error?.message || error)
      const message = error?.message || 'Failed to send message'
      client.emit('error', { message })
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) return

    client.to(`room:${data.roomId}`).emit('user_typing', {
      userId: client.userId,
      username: client.username,
      roomId: data.roomId,
      isTyping: true,
    })
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    if (!client.userId) return

    client.to(`room:${data.roomId}`).emit('user_typing', {
      userId: client.userId,
      username: client.username,
      roomId: data.roomId,
      isTyping: false,
    })
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    if (!client.userId) return

    try {
      await this.chatService.markMessageAsRead(data.messageId, client.userId)
      
      const message = await this.chatService.getMessage(data.messageId)
      if (message) {
        client.to(`room:${message.roomId}`).emit('message_read', {
          messageId: data.messageId,
          userId: client.userId,
          username: client.username,
          readAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      this.logger.error('Error marking message as read:', error)
    }
  }

  private isClientInSocketRoom(client: AuthenticatedSocket, roomId: string): boolean {
    try {
      const socketRoomKey = `room:${roomId}`
      return client?.rooms && typeof client.rooms.has === 'function' && client.rooms.has(socketRoomKey)
    } catch (error) {
      this.logger.warn(`Error checking socket room for user ${client?.username || 'unknown'}:`, error.message)
      return false
    }
  }

  private async autoJoinUserRooms(client: AuthenticatedSocket) {
    if (!client.userId) return

    try {
      const roomUsers = await this.prismaService.roomUser.findMany({
        where: { userId: client.userId },
        select: { roomId: true }
      })
      
      const roomIds = roomUsers.map(ru => ru.roomId)

      const joinPromises = roomIds.map(async (roomId) => {
        client.join(`room:${roomId}`)
        return this.redisService.addUserToRoom(client.userId!, roomId)
      })
      
      await Promise.all(joinPromises)
      
      this.logger.log(`User ${client.username} auto-joined ${roomIds.length} rooms`)
    } catch (error) {
      this.logger.error('Error auto-joining rooms:', error)
    }
  }

  sendMessageToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data)
  }

  async sendMessageToUser(userId: string, event: string, data: any) {
    const socketId = await this.redisService.getConnectedUser(userId)
    if (socketId) {
      this.server.to(socketId).emit(event, data)
    }
  }

  @SubscribeMessage('update_status')
  async handleStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: UserStatus }
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' }
    }

    this.logger.log(`Status update: ${client.username} -> ${data.status}`)

    await this.redisService.publish('user_status_changed', {
      userId: client.userId,
      username: client.username,
      status: data.status,
      timestamp: new Date().toISOString(),
    })

    return { success: true }
  }

  async notifyStatusChange(userId: string, username: string, status: UserStatus) {
    this.logger.log(`HTTP Status update: ${username} -> ${status}`)
    
    await this.redisService.publish('user_status_changed', {
      userId,
      username,
      status,
      timestamp: new Date().toISOString(),
    })
  }

  async getConnectedUsers(): Promise<string[]> {
    return await this.redisService.getAllConnectedUsers()
  }

  async isUserConnected(userId: string): Promise<boolean> {
    const socketId = await this.redisService.getConnectedUser(userId)
    return !!socketId
  }

  async notifyFriendRequest(userId: string, friendship: any) {
    this.logger.log(`Friend request notification: ${friendship.sender.username} -> ${friendship.receiver.username}`)
    
    const socketId = await this.redisService.getConnectedUser(userId)
    if (socketId) {
      this.server.to(socketId).emit('friend_request_received', {
        id: friendship.id,
        sender: friendship.sender,
        createdAt: friendship.createdAt,
      })
    }
  }

  async notifyFriendRequestResponse(userId: string, friendship: any) {
    this.logger.log(`Friend request response: ${friendship.receiver.username} -> ${friendship.sender.username} (${friendship.status})`)
    
    const socketId = await this.redisService.getConnectedUser(userId)
    if (socketId) {
      this.server.to(socketId).emit('friend_request_response', {
        id: friendship.id,
        receiver: friendship.receiver,
        status: friendship.status,
        updatedAt: friendship.updatedAt,
      })
    }
  }

  async notifyFriendRemoved(userId: string, removedById: string) {
    this.logger.log(`Friend removed notification: user ${removedById} removed user ${userId}`)
    
    const socketId = await this.redisService.getConnectedUser(userId)
    if (socketId) {
      this.server.to(socketId).emit('friend_removed', {
        removedById,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async notifyRoomInvitation(userId: string, invitation: any) {
    this.logger.log(`Room invitation: ${invitation.room.name} -> user ${userId}`)
    
    const socketId = await this.redisService.getConnectedUser(userId)
    if (socketId) {
      this.server.to(socketId).emit('room_invitation_received', invitation)
    }
  }
}
