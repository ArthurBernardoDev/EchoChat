import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../redis/redis.service'
import { PrismaService } from '../prisma/prisma.service'

interface RoomJoinRequest {
  userId: string
  roomId: string
  username: string
  socketId: string
  timestamp: number
}

interface RoomLeaveRequest {
  userId: string
  roomId: string
  username: string
  socketId: string
  timestamp: number
}

@Injectable()
export class RoomQueueService {
  private readonly logger = new Logger(RoomQueueService.name)
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('🏠 Room queue service initializing...')
    this.startProcessing()
    this.logger.log('✅ Room queue service initialized')
  }

  async onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    this.isProcessing = false
    this.logger.log('🏠 Room queue service stopped')
  }

  async addJoinRoomRequest(request: RoomJoinRequest): Promise<void> {
    try {
      const redisClient = this.redisService.getClient()
      await redisClient.lpush('room_join_queue', JSON.stringify(request))
      this.logger.debug(`Enqueued join request for user ${request.username} to room ${request.roomId}`)
    } catch (error) {
      this.logger.error('Failed to enqueue join room request:', error.message)
      throw error
    }
  }

  async addLeaveRoomRequest(request: RoomLeaveRequest): Promise<void> {
    try {
      const redisClient = this.redisService.getClient()
      await redisClient.lpush('room_leave_queue', JSON.stringify(request))
      this.logger.debug(`Enqueued leave request for user ${request.username} from room ${request.roomId}`)
    } catch (error) {
      this.logger.error('Failed to enqueue leave room request:', error.message)
      throw error
    }
  }

  private startProcessing(): void {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    this.logger.log('🔄 Starting room queue processing...')

    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueues()
      } catch (error) {
        this.logger.error('Error processing room queues:', error.message)
      }
    }, 100)
  }

  private async processQueues(): Promise<void> {
    const redisClient = this.redisService.getClient()

    try {
      const [joinRequests, leaveRequests] = await Promise.all([
        this.getBatchFromQueue(redisClient, 'room_join_queue', 10),
        this.getBatchFromQueue(redisClient, 'room_leave_queue', 10)
      ])

      if (joinRequests.length > 0) {
        await this.processJoinRequests(joinRequests)
      }

      if (leaveRequests.length > 0) {
        await this.processLeaveRequests(leaveRequests)
      }

    } catch (error) {
      this.logger.error('Error in queue processing:', error.message)
    }
  }

  private async getBatchFromQueue(redisClient: any, queueName: string, batchSize: number): Promise<any[]> {
    const requests: any[] = []
    
    for (let i = 0; i < batchSize; i++) {
      const item = await redisClient.rpop(queueName)
      if (!item) break
      
      try {
        requests.push(JSON.parse(item))
      } catch (parseError) {
        this.logger.warn(`Failed to parse queue item from ${queueName}:`, parseError.message)
      }
    }
    
    return requests
  }

  private async processJoinRequests(requests: RoomJoinRequest[]): Promise<void> {
    this.logger.debug(`Processing ${requests.length} join requests`)

    for (const request of requests) {
      try {
        await this.processJoinRequest(request)
      } catch (error) {
        this.logger.error(`Failed to process join request for user ${request.userId}:`, error.message)
        
        try {
          await this.retryJoinRequest(request)
        } catch (retryError) {
          this.logger.error(`Retry failed for join request ${request.userId}:`, retryError.message)
          await this.notifyJoinFailure(request, retryError.message)
        }
      }
    }
  }

  private async processJoinRequest(request: RoomJoinRequest): Promise<void> {
    const { userId, roomId, username, socketId } = request

    const existingMembership = await this.prismaService.roomUser.findUnique({
      where: { userId_roomId: { userId, roomId } }
    })

    if (existingMembership) {
      await this.notifyJoinSuccess(request)
      return
    }

    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
      select: { isPrivate: true, name: true }
    })

    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    if (room.isPrivate) {
      throw new Error(`Room ${roomId} is private`)
    }

    await this.prismaService.roomUser.create({
      data: {
        userId,
        roomId,
        role: 'MEMBER'
      }
    })

    await this.redisService.addUserToRoom(userId, roomId)

    await this.notifyJoinSuccess(request)

    this.logger.log(`✅ User ${username} successfully joined room ${room.name} via queue`)
  }

  private async retryJoinRequest(request: RoomJoinRequest): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100))
    await this.processJoinRequest(request)
  }

  private async processLeaveRequests(requests: RoomLeaveRequest[]): Promise<void> {
    this.logger.debug(`Processing ${requests.length} leave requests`)

    for (const request of requests) {
      try {
        await this.processLeaveRequest(request)
      } catch (error) {
        this.logger.error(`Failed to process leave request for user ${request.userId}:`, error.message)
        await this.notifyLeaveFailure(request, error.message)
      }
    }
  }

  private async processLeaveRequest(request: RoomLeaveRequest): Promise<void> {
    const { userId, roomId, username, socketId } = request

    // Verificar se é uma sala DM
    const room = await this.prismaService.room.findUnique({
      where: { id: roomId },
      select: { isDirect: true }
    })

    if (room?.isDirect) {
      // Para salas DM, apenas remover do Redis (presença online), mas manter no banco
      this.logger.debug(`User ${username} leaving DM room ${roomId} - keeping membership in database`)
      await this.redisService.removeUserFromRoom(userId, roomId)
    } else {
      // Para salas normais, remover completamente
      this.logger.debug(`User ${username} leaving regular room ${roomId} - removing from database`)
      await this.prismaService.roomUser.deleteMany({
        where: { userId, roomId }
      })
      await this.redisService.removeUserFromRoom(userId, roomId)
    }

    await this.notifyLeaveSuccess(request)

    this.logger.log(`✅ User ${username} successfully left room ${roomId} via queue`)
  }

  private async notifyJoinSuccess(request: RoomJoinRequest): Promise<void> {
    await this.redisService.publish('room_join_processed', {
      success: true,
      userId: request.userId,
      roomId: request.roomId,
      socketId: request.socketId,
      timestamp: Date.now()
    })
  }

  private async notifyJoinFailure(request: RoomJoinRequest, error: string): Promise<void> {
    await this.redisService.publish('room_join_processed', {
      success: false,
      userId: request.userId,
      roomId: request.roomId,
      socketId: request.socketId,
      error,
      timestamp: Date.now()
    })
  }

  private async notifyLeaveSuccess(request: RoomLeaveRequest): Promise<void> {
    await this.redisService.publish('room_leave_processed', {
      success: true,
      userId: request.userId,
      roomId: request.roomId,
      socketId: request.socketId,
      timestamp: Date.now()
    })
  }

  private async notifyLeaveFailure(request: RoomLeaveRequest, error: string): Promise<void> {
    await this.redisService.publish('room_leave_processed', {
      success: false,
      userId: request.userId,
      roomId: request.roomId,
      socketId: request.socketId,
      error,
      timestamp: Date.now()
    })
  }

  async getQueueStats(): Promise<{ joinQueue: number; leaveQueue: number }> {
    try {
      const redisClient = this.redisService.getClient()
      const [joinQueueSize, leaveQueueSize] = await Promise.all([
        redisClient.llen('room_join_queue'),
        redisClient.llen('room_leave_queue')
      ])

      return {
        joinQueue: joinQueueSize,
        leaveQueue: leaveQueueSize
      }
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error.message)
      return { joinQueue: 0, leaveQueue: 0 }
    }
  }
}
