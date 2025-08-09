import { Body, Controller, Get, Post, Request, UseGuards, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './types';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() data: RegisterDto): Promise<void> {
    this.logger.debug('AuthController.register: registering user %s', data.username);
    await this.authService.register(data);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK) 
  async login(@Request() req: { user: AuthenticatedUser }) {
    this.logger.debug('AuthController.login: logging in user %s', req.user.username);
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: { user: AuthenticatedUser }) {
    this.logger.debug('AuthController.getProfile: returning profile for user %s', req.user.username);
    return req.user;
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    this.logger.debug('AuthController.refresh: refreshing access token');
    return this.authService.refreshToken(body.refreshToken);
  }
}
