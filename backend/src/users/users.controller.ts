import { 
  Controller, 
  Get, 
  Put, 
  Patch,
  Delete,
  Body, 
  Request, 
  UseGuards, 
  HttpCode, 
  HttpStatus
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req: any, @Body() updateData: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() passwordData: ChangePasswordDto) {
    await this.usersService.changePassword(req.user.id, passwordData);
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Request() req: any, @Body() statusData: UpdateStatusDto) {
    return this.usersService.updateStatus(req.user.id, statusData.status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('avatar')
  @HttpCode(HttpStatus.OK)
  async updateAvatar(@Request() req: any, @Body() data: { avatar: string }) {
    return this.usersService.updateAvatar(req.user.id, data.avatar);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Request() req: any) {
    await this.usersService.deleteAccount(req.user.id);
  }
}
