import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChatService } from './chat.service'
import { GetMessagesDto } from './dto/get-messages.dto'

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query() query: GetMessagesDto,
    @Request() req: any,
  ) {
    return this.chatService.getMessages(roomId, req.user.id, query)
  }

  @Get('rooms/:roomId/unread-count')
  async getUnreadCount(
    @Param('roomId') roomId: string,
    @Request() req: any,
  ) {
    const count = await this.chatService.getUnreadCount(roomId, req.user.id)
    return { count }
  }

  @Post('messages/:messageId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    await this.chatService.markMessageAsRead(messageId, req.user.id)
  }

  @Post('rooms/:roomId/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(
    @Param('roomId') roomId: string,
    @Request() req: any,
  ) {
    await this.chatService.markAllRoomMessagesAsRead(roomId, req.user.id)
  }

  @Put('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.chatService.editMessage(messageId, req.user.id, body.content)
  }

  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    await this.chatService.deleteMessage(messageId, req.user.id)
  }

  @Post('messages/:messageId/reactions')
  async addReaction(
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
    @Request() req: any,
  ) {
    return this.chatService.addReaction(messageId, req.user.id, body.emoji)
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @Request() req: any,
  ) {
    await this.chatService.removeReaction(messageId, req.user.id, emoji)
  }

  @Get('unread-summary')
  async getUnreadSummary(@Request() req: any) {
    return this.chatService.getUnreadSummary(req.user.id)
  }

  @Post('dm/:friendId')
  async getOrCreateDirectMessage(
    @Param('friendId') friendId: string,
    @Request() req: any,
  ) {
    return this.chatService.getOrCreateDirectRoom(req.user.id, friendId)
  }
}
