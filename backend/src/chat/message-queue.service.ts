import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { RedisService } from '../redis/redis.service'
import { ChatService } from './chat.service'
import { PrismaService } from '../prisma/prisma.service'

interface QueuedMessage {
  userId: string
  roomId: string
  content: string
  replyToId?: string
  timestamp: string
  tempId: string
}

@Injectable()
export class MessageQueueService implements OnModuleInit {
  private readonly logger = new Logger(MessageQueueService.name)
  private readonly QUEUE_KEY = 'message_queue'
  private readonly BATCH_SIZE = 10
  private readonly PROCESS_INTERVAL = 100 // ms
  private isProcessing = false
  private processInterval: NodeJS.Timeout | null = null

  constructor(
    private redisService: RedisService,
    private chatService: ChatService,
    private prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    this.startProcessing()
    this.logger.log('✅ Message queue service initialized')
  }

  async enqueueMessage(message: Omit<QueuedMessage, 'timestamp' | 'tempId'>): Promise<string> {
    const queuedMessage: QueuedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      tempId: `temp_${Date.now()}_${message.userId}`,
    }

    try {
      await this.redisService.getClient().rpush(
        this.QUEUE_KEY,
        JSON.stringify(queuedMessage)
      )

      return queuedMessage.tempId
    } catch (error) {
      this.logger.error('Failed to enqueue message:', error)
      throw error
    }
  }

  private startProcessing() {
    if (this.processInterval) {
      return
    }

    this.processInterval = setInterval(async () => {
      if (this.isProcessing) {
        return 
      }

      await this.processBatch()
    }, this.PROCESS_INTERVAL)

    this.logger.log('Message queue processor started')
  }

  private async processBatch() {
    this.isProcessing = true

    try {
      const client = this.redisService.getClient()
      if (!client) {
        return
      }

      const messages: string[] = []
      for (let i = 0; i < this.BATCH_SIZE; i++) {
        const message = await client.lpop(this.QUEUE_KEY)
        if (!message) break
        messages.push(message)
      }

      if (messages.length === 0) {
        return 
      }

      const processPromises = messages.map(async (messageStr) => {
        try {
          const message: QueuedMessage = JSON.parse(messageStr)
          
          const savedMessage = await this.chatService.createMessage({
            userId: message.userId,
            roomId: message.roomId,
            content: message.content,
            replyToId: message.replyToId,
          })

          await this.redisService.publish('message_saved', {
            tempId: message.tempId,
            message: savedMessage,
          })

          return { success: true, tempId: message.tempId }
        } catch (error) {
          this.logger.error('Failed to process message:', error)
          
          try {
            const message = JSON.parse(messageStr)
            const retries = (message.retries || 0) + 1
            
            if (retries < 3) {
              await client.rpush(
                this.QUEUE_KEY,
                JSON.stringify({ ...message, retries })
              )
            } else {
              this.logger.error(`Message dropped after ${retries} retries:`, message)
            }
          } catch (requeueError) {
            this.logger.error('Failed to requeue message:', requeueError)
          }
          
          return { success: false, error }
        }
      })

      const results = await Promise.all(processPromises)
      const successful = results.filter(r => r.success).length
      
      if (successful > 0) {
        this.logger.debug(`Processed ${successful}/${messages.length} messages`)
      }
    } catch (error) {
      this.logger.error('Batch processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
      this.logger.log(' Message queue processor stopped')
    }
  }

  async getQueueSize(): Promise<number> {
    const client = this.redisService.getClient()
    if (!client) return 0
    
    return await client.llen(this.QUEUE_KEY)
  }

  async clearQueue(): Promise<void> {
    const client = this.redisService.getClient()
    if (!client) return
    
    await client.del(this.QUEUE_KEY)
    this.logger.warn('Message queue cleared')
  }
}
