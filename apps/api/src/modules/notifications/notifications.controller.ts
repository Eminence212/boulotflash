import { Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import { NotificationsService } from './notifications.service';

/** Centre in-app (API : `GET /notifications?unread=1`, `POST /notifications/{id}/read`). */
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() req: AuthedRequest, @Query('unread') unread?: string) {
    return this.notifications.list(req.userId!, unread === '1' || unread === 'true');
  }

  @Post(':id/read')
  read(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.notifications.markRead(req.userId!, id);
  }
}
