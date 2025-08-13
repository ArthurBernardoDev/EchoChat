import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { RoomRole } from '@prisma/client';
import { Inject, forwardRef } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async getUserRooms(userId: string) {
    this.logger.debug('RoomsService.getUserRooms: getting rooms for user %s', userId);
    
    const roomUsers = await this.prisma.roomUser.findMany({
      where: { userId },
      include: {
        room: {
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
            _count: {
              select: {
                users: true,
                messages: true,
              },
            },
          },
        },
      },
      orderBy: {
        room: {
          updatedAt: 'desc',
        },
      },
    });

    this.logger.debug('RoomsService.getUserRooms: found %d room users for user %s', roomUsers.length, userId);

    const result = roomUsers.map(roomUser => ({
      ...roomUser.room,
      userRole: roomUser.role,
      joinedAt: roomUser.joinedAt,
    }));

    this.logger.debug('RoomsService.getUserRooms: returning %d rooms for user %s', result.length, userId);
    return result;
  }

  async getRoom(userId: string, roomId: string) {
    this.logger.debug('RoomsService.getRoom: getting room %s for user %s', roomId, userId);
    
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      include: {
        room: {
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    status: true,
                    lastSeen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.debug('RoomsService.getRoom: roomUser found: %o', roomUser);

    if (!roomUser) {
      this.logger.error('RoomsService.getRoom: user %s does not have access to room %s', userId, roomId);
      throw new NotFoundException('Sala não encontrada ou você não tem acesso');
    }

    return {
      ...roomUser.room,
      userRole: roomUser.role,
      joinedAt: roomUser.joinedAt,
    };
  }

  async createRoom(userId: string, data: CreateRoomDto) {
    this.logger.debug('RoomsService.createRoom: creating room %s by user %s', data.name, userId);
    
    const room = await this.prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        isPrivate: data.isPrivate || false,
        maxMembers: data.maxMembers || 0,
        users: {
          create: {
            userId,
            role: 'OWNER',
          },
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
    });

    this.logger.log('RoomsService.createRoom: room %s created successfully', room.name);
    return room;
  }

  async updateRoom(userId: string, roomId: string, data: UpdateRoomDto) {
    this.logger.debug('RoomsService.updateRoom: updating room %s by user %s', roomId, userId);
    
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!roomUser) {
      throw new NotFoundException('Sala não encontrada');
    }

    if (roomUser.role !== 'OWNER' && roomUser.role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para editar esta sala');
    }

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data,
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
    });

    this.logger.log('RoomsService.updateRoom: room %s updated successfully', room.name);
    return room;
  }

  async deleteRoom(userId: string, roomId: string) {
    this.logger.debug('RoomsService.deleteRoom: deleting room %s by user %s', roomId, userId);
    
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!roomUser) {
      throw new NotFoundException('Sala não encontrada');
    }

    if (roomUser.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono pode deletar a sala');
    }

    await this.prisma.room.delete({
      where: { id: roomId },
    });

    this.logger.log('RoomsService.deleteRoom: room deleted successfully');
  }

  async inviteUser(inviterId: string, roomId: string, username: string) {
    this.logger.debug('RoomsService.inviteUser: inviting %s to room %s', username, roomId);
    this.logger.debug('RoomsService.inviteUser: inviter ID %s', inviterId);
    
    const inviterRoomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId: inviterId,
          roomId,
        },
      },
      include: {
        room: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!inviterRoomUser) {
      this.logger.error('RoomsService.inviteUser: inviter not found in room %s', roomId);
      throw new NotFoundException('Sala não encontrada');
    }
    
    this.logger.debug('RoomsService.inviteUser: inviter role %s', inviterRoomUser.role);

    if (inviterRoomUser.role === 'MEMBER') {
      throw new ForbiddenException('Você não tem permissão para convidar usuários');
    }

    const userToInvite = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!userToInvite) {
      this.logger.error('RoomsService.inviteUser: user %s not found', username);
      throw new NotFoundException('Usuário não encontrado');
    }
    
    this.logger.debug('RoomsService.inviteUser: found user %s with ID %s', username, userToInvite.id);

    const existingMember = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId: userToInvite.id,
          roomId,
        },
      },
    });

    if (existingMember) {
      this.logger.error('RoomsService.inviteUser: user %s already member of room %s', username, roomId);
      throw new BadRequestException('Usuário já é membro desta sala');
    }
    
    this.logger.debug('RoomsService.inviteUser: user %s not a member, proceeding with invite', username);

    const newMember = await this.prisma.roomUser.create({
      data: {
        userId: userToInvite.id,
        roomId,
        role: 'MEMBER',
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
        room: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    this.chatGateway.notifyRoomInvitation(userToInvite.id, {
      room: newMember.room,
      invitedBy: inviterRoomUser.user,
    });

    this.logger.log('RoomsService.inviteUser: user %s invited successfully', username);
    return newMember;
  }

  async joinRoom(userId: string, roomId: string) {
    this.logger.debug('RoomsService.joinRoom: user %s joining room %s', userId, roomId);
    
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }

    if (room.isPrivate) {
      throw new ForbiddenException('Esta sala é privada');
    }

    const existingMember = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Você já é membro desta sala');
    }

    const newMember = await this.prisma.roomUser.create({
      data: {
        userId,
        roomId,
        role: 'MEMBER',
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
        room: true,
      },
    });

    this.logger.log('RoomsService.joinRoom: user joined successfully');
    return newMember;
  }

  async leaveRoom(userId: string, roomId: string) {
    this.logger.debug('RoomsService.leaveRoom: user %s leaving room %s', userId, roomId);
    
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!roomUser) {
      throw new NotFoundException('Você não é membro desta sala');
    }

    if (roomUser.role === 'OWNER') {
      const memberCount = await this.prisma.roomUser.count({
        where: { roomId },
      });

      if (memberCount > 1) {
        throw new BadRequestException('Transfira a propriedade antes de sair da sala');
      }
    }

    await this.prisma.roomUser.delete({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    this.logger.log('RoomsService.leaveRoom: user left room successfully');
  }

  async removeMember(requesterId: string, roomId: string, userId: string) {
    this.logger.debug('RoomsService.removeMember: removing user %s from room %s', userId, roomId);
    
    const requesterRoomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId: requesterId,
          roomId,
        },
      },
    });

    if (!requesterRoomUser) {
      throw new NotFoundException('Sala não encontrada');
    }

    if (requesterRoomUser.role !== 'OWNER' && requesterRoomUser.role !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para remover membros');
    }

    const targetRoomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!targetRoomUser) {
      throw new NotFoundException('Usuário não é membro desta sala');
    }

    if (targetRoomUser.role === 'OWNER') {
      throw new ForbiddenException('Não é possível remover o dono da sala');
    }

    await this.prisma.roomUser.delete({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    this.logger.log('RoomsService.removeMember: member removed successfully');
  }

  async getRoomMembers(userId: string, roomId: string) {
    this.logger.debug('RoomsService.getRoomMembers: getting members for room %s', roomId);
    
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!roomUser) {
      throw new NotFoundException('Sala não encontrada');
    }

    const members = await this.prisma.roomUser.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return members;
  }

  async muteMember(requesterId: string, roomId: string, userId: string, minutes: number) {
    this.logger.debug('RoomsService.muteMember: muting user %s in room %s for %d minutes', userId, roomId, minutes);
    
    if (requesterId === userId) {
      throw new BadRequestException('Você não pode silenciar a si mesmo');
    }

    const requester = await this.prisma.roomUser.findUnique({
      where: { userId_roomId: { userId: requesterId, roomId } },
    });
    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN' && requester.role !== 'MODERATOR')) {
      throw new ForbiddenException('Sem permissão para silenciar');
    }

    const targetUser = await this.prisma.roomUser.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (targetUser?.role === 'OWNER') {
      throw new ForbiddenException('Não é possível silenciar o dono do grupo');
    }

    const until = new Date(Date.now() + minutes * 60 * 1000);
    return this.prisma.roomUser.update({
      where: { userId_roomId: { userId, roomId } },
      data: { mutedUntil: until },
    });
  }

  async banMember(requesterId: string, roomId: string, userId: string, reason?: string) {
    this.logger.debug('RoomsService.banMember: banning user %s from room %s', userId, roomId);
    
    if (requesterId === userId) {
      throw new BadRequestException('Você não pode banir a si mesmo');
    }

    const requester = await this.prisma.roomUser.findUnique({
      where: { userId_roomId: { userId: requesterId, roomId } },
    });
    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      throw new ForbiddenException('Sem permissão para banir');
    }

    const targetUser = await this.prisma.roomUser.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (targetUser?.role === 'OWNER') {
      throw new ForbiddenException('Não é possível banir o dono do grupo');
    }

    await this.prisma.roomUser.delete({ where: { userId_roomId: { userId, roomId } } }).catch(() => undefined);
    await this.prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { reason },
      create: { roomId, userId, reason },
    });
    return { ok: true };
  }

  async unbanMember(requesterId: string, roomId: string, userId: string) {
    this.logger.debug('RoomsService.unbanMember: unbanning user %s from room %s', userId, roomId);
    
    if (requesterId === userId) {
      throw new BadRequestException('Você não pode desbanir a si mesmo');
    }

    const requester = await this.prisma.roomUser.findUnique({
      where: { userId_roomId: { userId: requesterId, roomId } },
    });
    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      throw new ForbiddenException('Sem permissão para desbanir');
    }
    await this.prisma.roomBan.delete({ where: { roomId_userId: { roomId, userId } } });
    return { ok: true };
  }

  async updateMemberRole(requesterId: string, roomId: string, userId: string, role: RoomRole) {
    this.logger.debug('RoomsService.updateMemberRole: updating role for user %s in room %s', userId, roomId);
    
    const requesterRoomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId: requesterId,
          roomId,
        },
      },
    });

    if (!requesterRoomUser || requesterRoomUser.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono pode alterar roles');
    }

    if (userId === requesterId && role !== 'OWNER') {
      throw new BadRequestException('O dono não pode alterar seu próprio role');
    }

    const updatedMember = await this.prisma.roomUser.update({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      data: { role },
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
    });

    this.logger.log('RoomsService.updateMemberRole: role updated successfully');
    return updatedMember;
  }

  async userHasAccessToRoom(userId: string, roomId: string): Promise<boolean> {
    const roomUser = await this.prisma.roomUser.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    return !!roomUser;
  }

  async searchPublicRooms(userId: string, query: string) {
    this.logger.debug('RoomsService.searchPublicRooms: searching for %s', query);
    
    if (query.length < 2) {
      return [];
    }

    const rooms = await this.prisma.room.findMany({
      where: {
        AND: [
          { isPrivate: false }, // Only public rooms
          { isDirect: false }, // Not direct messages
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        users: {
          where: {
            userId: userId,
          },
        },
        _count: {
          select: {
            users: true,
            messages: true,
          },
        },
      },
      take: 20,
      orderBy: [
        { users: { _count: 'desc' } }, // More popular rooms first
        { updatedAt: 'desc' },
      ],
    });

    return rooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      avatar: room.avatar,
      isPrivate: room.isPrivate,
      isDirect: room.isDirect,
      maxMembers: room.maxMembers,
      memberCount: room._count.users,
      messageCount: room._count.messages,
      isMember: room.users.length > 0,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));
  }
}
