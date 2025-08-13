import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { ChatGateway } from './chat.gateway'
import { MessageQueueService } from './message-queue.service'
import { RoomQueueService } from './room-queue.service'
import { PrismaModule } from '../prisma/prisma.module'

import { RedisModule } from '../redis/redis.module'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, MessageQueueService, RoomQueueService],
  exports: [ChatService, ChatGateway, MessageQueueService, RoomQueueService],
})
export class ChatModule {}
