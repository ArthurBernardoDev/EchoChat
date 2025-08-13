import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis
  private subscriber: Redis
  private publisher: Redis

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379'
    
    try {
      const redisOptions = {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      }
      
      this.client = new Redis(redisUrl, redisOptions)

      this.publisher = new Redis(redisUrl, redisOptions)

      this.subscriber = new Redis(redisUrl, redisOptions)

      await Promise.all([
        this.client.connect(),
        this.publisher.connect(),
        this.subscriber.connect(),
      ])

      this.logger.log('✅ Redis connected successfully')
    } catch (error) {
      this.logger.error('❌ Failed to connect to Redis:', error.message)
      this.logger.warn('⚠️ Running without Redis - not suitable for production')
    }
  }

  async onModuleDestroy() {
    try {
      await Promise.all([
        this.client?.quit(),
        this.publisher?.quit(),
        this.subscriber?.quit(),
      ])
      this.logger.log('❌ Redis disconnected')
    } catch (error) {
      this.logger.error('Error disconnecting Redis:', error)
    }
  }

  async setConnectedUser(userId: string, socketId: string): Promise<void> {
    if (!this.client) return
    await this.client.hset('connected_users', userId, socketId)
  }

  async removeConnectedUser(userId: string): Promise<void> {
    if (!this.client) return
    await this.client.hdel('connected_users', userId)
  }

  async getConnectedUser(userId: string): Promise<string | null> {
    if (!this.client) return null
    return await this.client.hget('connected_users', userId)
  }

  async getAllConnectedUsers(): Promise<string[]> {
    if (!this.client) return []
    return await this.client.hkeys('connected_users')
  }

  async addUserToRoom(userId: string, roomId: string): Promise<void> {
    if (!this.client) return
    const pipeline = this.client.pipeline()
    pipeline.sadd(`user_rooms:${userId}`, roomId)
    pipeline.sadd(`room_users:${roomId}`, userId)
    pipeline.expire(`user_rooms:${userId}`, 3600) // TTL de 1 hora
    pipeline.expire(`room_users:${roomId}`, 3600)
    await pipeline.exec()
  }

  async removeUserFromRoom(userId: string, roomId: string): Promise<void> {
    if (!this.client) return
    const pipeline = this.client.pipeline()
    pipeline.srem(`user_rooms:${userId}`, roomId)
    pipeline.srem(`room_users:${roomId}`, userId)
    await pipeline.exec()
  }

  async getUserRooms(userId: string): Promise<string[]> {
    if (!this.client) return []
    return await this.client.smembers(`user_rooms:${userId}`)
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    if (!this.client) return false
    const result = await this.client.sismember(`user_rooms:${userId}`, roomId)
    return result === 1
  }

  async removeAllUserRooms(userId: string): Promise<void> {
    if (!this.client) return
    try {
      const rooms = await this.client.smembers(`user_rooms:${userId}`)
      
      if (rooms && rooms.length > 0) {
        const pipeline = this.client.pipeline()
        
        rooms.forEach(roomId => {
          pipeline.srem(`room_users:${roomId}`, userId)
        })
        
        pipeline.del(`user_rooms:${userId}`)
        
        await pipeline.exec()
      }
    } catch (error) {
      await this.client.del(`user_rooms:${userId}`)
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.publisher) return
    await this.publisher.publish(channel, JSON.stringify(message))
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.subscriber) return
    
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message)
          callback(parsedMessage)
        } catch (error) {
          this.logger.error('Error parsing Redis message:', error)
        }
      }
    })
  }

  async setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.client) return
    await this.client.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async getCache<T>(key: string): Promise<T | null> {
    if (!this.client) return null
    const cached = await this.client.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async deleteCache(key: string): Promise<void> {
    if (!this.client) return
    await this.client.del(key)
  }

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    if (!this.client) return { allowed: true, remaining: limit }
    
    const current = await this.client.incr(key)
    
    if (current === 1) {
      await this.client.expire(key, windowSeconds)
    }
    
    const remaining = Math.max(0, limit - current)
    return {
      allowed: current <= limit,
      remaining,
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false
    try {
      await this.client.ping()
      return true
    } catch {
      return false
    }
  }

  getClient(): any {
    return this.client
  }
}
