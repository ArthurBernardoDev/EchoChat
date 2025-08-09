import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { AuthenticatedUser } from './types';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      createUser: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signedToken'),
      verify: jest.fn().mockReturnValue({ sub: '123', username: 'john' }),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_SECRET') return 'refreshSecret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return 'secret';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should validate user with correct credentials', async () => {
    const user = { id: '123', username: 'john', password: await bcrypt.hash('pass', 10) };
    (usersService.findByUsername as jest.Mock).mockResolvedValue(user);
    const result = await service.validateUser('john', 'pass');
    expect(result).toEqual({ id: '123', username: 'john' });
  });

  it('should return null for invalid credentials', async () => {
    (usersService.findByUsername as jest.Mock).mockResolvedValue(null);
    const result = await service.validateUser('john', 'pass');
    expect(result).toBeNull();
  });

  it('should login and return tokens', async () => {
    const user: AuthenticatedUser = {
      id: '123',
      username: 'john',
      email: 'a@b.com',
      avatar: null,
      bio: null,
      status: UserStatus.ONLINE,
      lastSeen: new Date(),
      isVerified: false,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tokens = await service.login(user);
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(jwtService.sign).toHaveBeenCalled();
  });

  it('should register user', async () => {
    const dto = { email: 'a@b.com', username: 'john', password: 'pass' };
    (usersService.createUser as jest.Mock).mockResolvedValue({ id: '123', ...dto });
    const result = await service.register(dto);
    expect(result).toEqual({ id: '123', email: 'a@b.com', username: 'john', password: 'pass' });
  });

  it('should refresh token', async () => {
    const result = await service.refreshToken('someToken');
    expect(result).toHaveProperty('accessToken');
    expect(jwtService.verify).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalled();
  });
});
