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
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InviteUserDto } from './dto/invite-user.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserRooms(@Request() req: any) {
    return this.roomsService.getUserRooms(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/public')
  async searchPublicRooms(@Request() req: any, @Query('q') query: string) {
    return this.roomsService.searchPublicRooms(req.user.id, query || '');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':roomId')
  async getRoom(@Request() req: any, @Param('roomId') roomId: string) {
    return this.roomsService.getRoom(req.user.id, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRoom(@Request() req: any, @Body() data: CreateRoomDto) {
    return this.roomsService.createRoom(req.user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':roomId')
  @HttpCode(HttpStatus.OK)
  async updateRoom(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Body() data: UpdateRoomDto
  ) {
    return this.roomsService.updateRoom(req.user.id, roomId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoom(@Request() req: any, @Param('roomId') roomId: string) {
    await this.roomsService.deleteRoom(req.user.id, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Body() data: InviteUserDto
  ) {
    return this.roomsService.inviteUser(req.user.id, roomId, data.username);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/join')
  @HttpCode(HttpStatus.OK)
  async joinRoom(@Request() req: any, @Param('roomId') roomId: string) {
    return this.roomsService.joinRoom(req.user.id, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveRoom(@Request() req: any, @Param('roomId') roomId: string) {
    await this.roomsService.leaveRoom(req.user.id, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string
  ) {
    await this.roomsService.removeMember(req.user.id, roomId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':roomId/members')
  async getRoomMembers(@Request() req: any, @Param('roomId') roomId: string) {
    return this.roomsService.getRoomMembers(req.user.id, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':roomId/members/:userId/role')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() data: { role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' }
  ) {
    return this.roomsService.updateMemberRole(req.user.id, roomId, userId, data.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':roomId/members/:userId/mute')
  async muteMember(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() data: { minutes: number }
  ) {
    return this.roomsService.muteMember(req.user.id, roomId, userId, data.minutes ?? 10);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/members/:userId/ban')
  async banMember(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
    @Body() data: { reason?: string }
  ) {
    return this.roomsService.banMember(req.user.id, roomId, userId, data.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':roomId/members/:userId/ban')
  async unbanMember(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    return this.roomsService.unbanMember(req.user.id, roomId, userId);
  }
}
