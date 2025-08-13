import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/register.dto';
import { Logger } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Inject, forwardRef } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    this.logger.debug('UsersService.findByUsername: searching user %s', username);
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug('UsersService.findByEmail: searching user by email %s', email);
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: RegisterDto): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      this.logger.warn('UsersService.createUser: user or email already exists');
      throw new ConflictException('Email or username already registered');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
    this.logger.log('UsersService.createUser: user %s created', newUser.username);
    return newUser;
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug('UsersService.findById: searching user %s', id);
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    this.logger.debug('UsersService.getProfile: getting profile for user %s', userId);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: UpdateProfileDto): Promise<Omit<User, 'password'>> {
    this.logger.debug('UsersService.updateProfile: updating user %s', userId);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (data.email || data.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: userId } },
            {
              OR: [
                data.email ? { email: data.email } : {},
                data.username ? { username: data.username } : {},
              ],
            },
          ],
        },
      });
      
      if (existing) {
        throw new ConflictException('Email or username already in use');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.email && { email: data.email }),
        ...(data.username && { username: data.username }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
    });

    this.logger.log('UsersService.updateProfile: user %s updated', updatedUser.username);
    
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    this.logger.debug('UsersService.changePassword: changing password for user %s', userId);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.logger.log('UsersService.changePassword: password changed for user %s', user.username);
  }

  async updateStatus(userId: string, status: UserStatus): Promise<Omit<User, 'password'>> {
    this.logger.debug('UsersService.updateStatus: updating status for user %s to %s', userId, status);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { 
        status,
        lastSeen: new Date(),
      },
    });

    this.logger.log('UsersService.updateStatus: status updated for user %s', updatedUser.username);
    
    this.chatGateway.notifyStatusChange(updatedUser.id, updatedUser.username, status);
    
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateAvatar(userId: string, avatar: string | null): Promise<Omit<User, 'password'>> {
    this.logger.debug('UsersService.updateAvatar: updating avatar for user %s', userId);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar },
    });

    this.logger.log('UsersService.updateAvatar: avatar updated for user %s', updatedUser.username);
    
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteAccount(userId: string): Promise<void> {
    this.logger.debug('UsersService.deleteAccount: deleting account for user %s', userId);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Deletar todas as relações do usuário em uma transação
    await this.prisma.$transaction(async (tx) => {
      // Deletar mensagens do usuário
      await tx.message.deleteMany({
        where: { userId }
      });

      // Deletar relacionamentos de amizade
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      });

      // Deletar membros de salas
      await tx.roomUser.deleteMany({
        where: { userId }
      });

      // Deletar convites de salas criados pelo usuário
      await tx.roomInvite.deleteMany({
        where: { createdBy: userId }
      });

      // Deletar banimentos de salas
      await tx.roomBan.deleteMany({
        where: { userId }
      });

      // Deletar configurações do usuário
      await tx.userSettings.deleteMany({
        where: { userId }
      });

      // Finalmente, deletar o usuário
      await tx.user.delete({
        where: { id: userId }
      });
    });

    this.logger.log('UsersService.deleteAccount: account deleted for user %s', user.username);
  }
}
