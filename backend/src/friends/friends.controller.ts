import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Controller('friends')
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('requests')
  async getFriendRequests(@Request() req: any) {
    return this.friendsService.getFriendRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sent-requests')
  async getSentFriendRequests(@Request() req: any) {
    return this.friendsService.getSentFriendRequests(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async sendFriendRequest(@Request() req: any, @Body() data: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.id, data.username);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('request/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  async acceptFriendRequest(@Request() req: any, @Param('requestId') requestId: string) {
    return this.friendsService.respondToFriendRequest(req.user.id, requestId, 'ACCEPTED');
  }

  @UseGuards(JwtAuthGuard)
  @Patch('request/:requestId/decline')
  @HttpCode(HttpStatus.OK)
  async declineFriendRequest(@Request() req: any, @Param('requestId') requestId: string) {
    return this.friendsService.respondToFriendRequest(req.user.id, requestId, 'DECLINED');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':friendId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFriend(@Request() req: any, @Param('friendId') friendId: string) {
    await this.friendsService.removeFriend(req.user.id, friendId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUsers(@Request() req: any, @Query('q') query: string) {
    return this.friendsService.searchUsers(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('online')
  async getOnlineFriends(@Request() req: any) {
    return this.friendsService.getOnlineFriends(req.user.id);
  }
}
