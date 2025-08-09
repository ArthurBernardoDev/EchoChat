import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser, JwtPayload } from './types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<AuthenticatedUser | null> {
    this.logger.debug('AuthService.validateUser: validating user %s', username);
    const user = await this.usersService.findByUsername(username);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result as AuthenticatedUser;
    }
    return null;
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  async login(user: AuthenticatedUser): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.log('AuthService.login: user %s logged in', user.username);
    const payload: JwtPayload = { username: user.username, sub: user.id };
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  async register(data: RegisterDto): Promise<void> {
    try {
      const created = await this.usersService.createUser(data);
      this.logger.log('AuthService.register: user %s registered', created.username);
    } catch (error) {
      this.logger.warn(
        'AuthService.register: error registering user %s - %s',
        data.username,
        error.message,
      );
      throw error;
    }
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      this.logger.debug('AuthService.refreshToken: refresh token valid for user %s', payload.username);
      return {
        accessToken: this.generateAccessToken({
          sub: payload.sub,
          username: payload.username,
        }),
      };
    } catch (error) {
      this.logger.warn('AuthService.refreshToken: invalid refresh token - %s', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
