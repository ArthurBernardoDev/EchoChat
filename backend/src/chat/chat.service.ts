import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { GetMessagesDto } from './dto/get-messages.dto'
import { UserStatus } from '@prisma/client'

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name)

  constructor(private prisma: PrismaService) {}

  async createMessage(data: CreateMessageDto) {
    const { userId, roomId, content, replyToId } = data

    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    })

    if (!roomUser) {
      throw new ForbiddenException('User does not have access to this room')
    }

    if (roomUser.mutedUntil && roomUser.mutedUntil > new Date()) {
      throw new ForbiddenException('You are muted and cannot send messages now')
    }

    if (replyToId) {
      const replyMessage = await this.prisma.message.findFirst({
        where: {
          id: replyToId,
          roomId,
          deleted: false,
        },
      })

      if (!replyMessage) {
        throw new NotFoundException('Reply message not found')
      }
    }

    const message = await this.prisma.message.create({
      data: {
        userId,
        roomId,
        content,
        replyToId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            replies: true,
          },
        },
      },
    })

    return message
  }

  async getMessages(roomId: string, userId: string, query: GetMessagesDto) {
    this.logger.debug('getMessages: getting messages for room %s, user %s', roomId, userId)
    const { limit = 50, before, after } = query

    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    })

    this.logger.debug('getMessages: roomUser found: %o', roomUser)

    if (!roomUser) {
      this.logger.error('getMessages: user %s does not have access to room %s', userId, roomId)
      throw new ForbiddenException('User does not have access to this room')
    }

    const whereClause: any = {
      roomId,
      deleted: false,
    }

    if (before) {
      whereClause.createdAt = { lt: new Date(before) }
    }

    if (after) {
      whereClause.createdAt = { gt: new Date(after) }
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        _count: {
          select: {
            reactions: true,
            replies: true,
          },
        },
      },
    })

    return {
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
    }
  }

  async getMessage(messageId: string) {
    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })
  }

  async markMessageAsRead(messageId: string, userId: string) {
    return this.prisma.messageReadReceipt.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        messageId,
        userId,
      },
    })
  }

  async markAllRoomMessagesAsRead(roomId: string, userId: string) {
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        roomId,
        deleted: false,
        userId: {
          not: userId, // Exclude user's own messages
        },
        NOT: {
          readReceipts: {
            some: {
              userId,
            },
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (unreadMessages.length > 0) {
      await this.prisma.messageReadReceipt.createMany({
        data: unreadMessages.map(message => ({
          messageId: message.id,
          userId,
        })),
        skipDuplicates: true,
      })
    }

    return unreadMessages.length
  }

  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages')
    }

    if (message.deleted) {
      throw new ForbiddenException('Cannot edit deleted message')
    }

    const editHistory = Array.isArray(message.editHistory) ? message.editHistory : []
    const newHistoryEntry = {
      content: message.content,
      editedAt: new Date().toISOString(),
    }
    editHistory.push(newHistoryEntry)

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        edited: true,
        editHistory: editHistory as any,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    })
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      throw new NotFoundException('Message not found')
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages')
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        content: '[Mensagem deletada]',
      },
    })
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
        update: {},
      create: {
        messageId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    })
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    })
  }

  async getUnreadCount(roomId: string, userId: string) {
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    })

    if (!roomUser) {
      return 0
    }

    return this.prisma.message.count({
      where: {
        roomId,
        deleted: false,
        userId: {
          not: userId, 
        },
        createdAt: {
          gt: roomUser.joinedAt,
        },
        NOT: {
          readReceipts: {
            some: {
              userId,
            },
          },
        },
      },
    })
  }

  async getOrCreateDirectRoom(userId1: string, userId2: string) {
    this.logger.debug('getOrCreateDirectRoom: creating DM between %s and %s', userId1, userId2)
    
    // Garantir ordem consistente dos IDs para evitar duplicatas
    const [smallerId, largerId] = [userId1, userId2].sort()
    this.logger.debug('getOrCreateDirectRoom: sorted IDs - smaller: %s, larger: %s', smallerId, largerId)
    
    // Primeiro, tentar encontrar uma sala DM existente
    const existingRoom = await this.prisma.room.findFirst({
      where: {
        isDirect: true,
        AND: [
          {
            users: {
              some: {
                userId: smallerId,
              },
            },
          },
          {
            users: {
              some: {
                userId: largerId,
              },
            },
          },
        ],
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (existingRoom) {
      this.logger.debug('getOrCreateDirectRoom: found existing room %s', existingRoom.id)
      return existingRoom
    }

    this.logger.debug('getOrCreateDirectRoom: no existing room found, creating new one')
    
    // Se não existir, criar uma nova sala DM
    // Usar nome consistente baseado na ordem dos IDs
    const roomName = `DM-${smallerId}-${largerId}`
    this.logger.debug('getOrCreateDirectRoom: room name will be %s', roomName)
    
    try {
      const room = await this.prisma.room.create({
        data: {
          name: roomName,
          isDirect: true,
          isPrivate: true,
          users: {
            create: [
              { userId: smallerId, role: 'MEMBER' },
              { userId: largerId, role: 'MEMBER' },
            ],
          },
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      return room
    } catch (error: any) {
      this.logger.error('getOrCreateDirectRoom: error creating room: %s', error.message)
      this.logger.error('getOrCreateDirectRoom: error details: %o', error)
      
      // Se falhar ao criar (possível duplicata), tentar buscar novamente
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        this.logger.debug('getOrCreateDirectRoom: unique constraint violation, trying to find existing room by name')
        
        // Buscar pela sala com o nome exato
        const retryRoom = await this.prisma.room.findFirst({
          where: {
            name: roomName,
            isDirect: true,
          },
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    status: true,
                  },
                },
              },
            },
          },
        })

        if (retryRoom) {
          this.logger.debug('getOrCreateDirectRoom: found existing room by name: %s', retryRoom.id)
          return retryRoom
        }
        
        this.logger.error('getOrCreateDirectRoom: could not find room by name either: %s', roomName)
      }
      
      throw error
    }
  }

  async getUnreadSummary(userId: string) {
    const userRooms = await this.prisma.roomUser.findMany({
      where: { userId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            isDirect: true,
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    const unreadCounts = await Promise.all(
      userRooms.map(async (roomUser) => {
        const unreadCount = await this.getUnreadCount(roomUser.room.id, userId)
        
        let displayName = roomUser.room.name
        let otherUser: { username: string; avatar: string | null; id: string; status: UserStatus } | null = null
        
        if (roomUser.room.isDirect) {
          const foundUser = roomUser.room.users.find(u => u.user.id !== userId)
          otherUser = foundUser?.user || null
          displayName = otherUser?.username || 'DM'
        }

        return {
          roomId: roomUser.room.id,
          roomName: displayName,
          isDirect: roomUser.room.isDirect,
          unreadCount,
          otherUser, // Para DMs
        }
      })
    )

    return {
      rooms: unreadCounts.filter(room => !room.isDirect),
      directMessages: unreadCounts.filter(room => room.isDirect),
      totalUnread: unreadCounts.reduce((sum, room) => sum + room.unreadCount, 0),
    }
  }
}
