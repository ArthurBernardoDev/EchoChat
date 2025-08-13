import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { Inject, forwardRef } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async getFriends(userId: string) {
    this.logger.debug('FriendsService.getFriends: getting friends for user %s', userId);
    
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });

    return friendships.map(friendship => {
      const friend = friendship.senderId === userId ? friendship.receiver : friendship.sender;
      return {
        friendshipId: friendship.id,
        friend,
        since: friendship.createdAt,
      };
    });
  }

  async getFriendRequests(userId: string) {
    this.logger.debug('FriendsService.getFriendRequests: getting requests for user %s', userId);
    
    return this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSentFriendRequests(userId: string) {
    this.logger.debug('FriendsService.getSentFriendRequests: getting sent requests for user %s', userId);
    
    return this.prisma.friendship.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async sendFriendRequest(senderId: string, receiverUsername: string) {
    this.logger.debug('FriendsService.sendFriendRequest: %s sending request to %s', senderId, receiverUsername);
    
    const receiver = await this.prisma.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!receiver) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (receiver.id === senderId) {
      throw new BadRequestException('Você não pode adicionar a si mesmo');
    }

    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw new ConflictException('Vocês já são amigos');
      }
      if (existingFriendship.status === 'PENDING') {
        throw new ConflictException('Solicitação já enviada');
      }
      if (existingFriendship.status === 'BLOCKED') {
        throw new BadRequestException('Não é possível enviar solicitação');
      }
      if (existingFriendship.status === 'DECLINED') {
        const friendship = await this.prisma.friendship.update({
          where: { id: existingFriendship.id },
          data: {
            status: 'PENDING',
            senderId,
            receiverId: receiver.id,
            updatedAt: new Date(),
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
            receiver: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        this.chatGateway.notifyFriendRequest(receiver.id, friendship);
        this.logger.log('FriendsService.sendFriendRequest: request sent successfully (updated declined)');
        return friendship;
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        senderId,
        receiverId: receiver.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    this.chatGateway.notifyFriendRequest(receiver.id, friendship);

    this.logger.log('FriendsService.sendFriendRequest: request sent successfully');
    return friendship;
  }

  async respondToFriendRequest(userId: string, requestId: string, response: 'ACCEPTED' | 'DECLINED') {
    this.logger.debug('FriendsService.respondToFriendRequest: %s responding %s to %s', userId, response, requestId);
    
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (friendship.receiverId !== userId) {
      throw new BadRequestException('Você não pode responder a esta solicitação');
    }

    if (friendship.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitação já foi respondida');
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: response },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    this.chatGateway.notifyFriendRequestResponse(friendship.senderId, updatedFriendship);

    this.logger.log('FriendsService.respondToFriendRequest: response sent successfully');
    return updatedFriendship;
  }

  async removeFriend(userId: string, friendId: string) {
    this.logger.debug('FriendsService.removeFriend: %s removing %s', userId, friendId);
    
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId, status: 'ACCEPTED' },
          { senderId: friendId, receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Amizade não encontrada');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    this.chatGateway.notifyFriendRemoved(friendId, userId);

    this.logger.log('FriendsService.removeFriend: friend removed successfully');
  }

  async searchUsers(currentUserId: string, query: string) {
    this.logger.debug('FriendsService.searchUsers: searching for %s', query);
    
    if (query.length < 2) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true,
      },
      take: 10,
    });

    const usersWithFriendshipStatus = await Promise.all(
      users.map(async (user) => {
        const friendship = await this.prisma.friendship.findFirst({
          where: {
            OR: [
              { senderId: currentUserId, receiverId: user.id },
              { senderId: user.id, receiverId: currentUserId },
            ],
          },
        });

        return {
          ...user,
          friendshipStatus: friendship?.status || null,
          isFriend: friendship?.status === 'ACCEPTED',
          hasPendingRequest: friendship?.status === 'PENDING',
        };
      })
    );

    return usersWithFriendshipStatus;
  }

  async getOnlineFriends(userId: string) {
    this.logger.debug('FriendsService.getOnlineFriends: getting online friends for user %s', userId);
    
    const friends = await this.getFriends(userId);
    return friends.filter(({ friend }) => 
      friend.status === 'ONLINE' || friend.status === 'IDLE' || friend.status === 'DO_NOT_DISTURB'
    );
  }
}
