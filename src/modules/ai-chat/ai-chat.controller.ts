import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('chat')
  async chat(
    @Req() req: any,
    @Body() body: { message?: string; chatHistoryId?: string },
  ) {
    return this.aiChatService.chat(req.user.id, body?.message || '', body?.chatHistoryId);
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return this.aiChatService.getHistory(req.user.id);
  }

  @Get('history/:id')
  async getHistoryById(@Req() req: any, @Param('id') id: string) {
    return this.aiChatService.getHistoryById(req.user.id, id);
  }

  @Delete('history/:id')
  async deleteHistory(@Req() req: any, @Param('id') id: string) {
    return this.aiChatService.deleteHistory(req.user.id, id);
  }
}
