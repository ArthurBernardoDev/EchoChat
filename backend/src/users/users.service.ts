import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/register.dto';
import { Logger } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

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
}
