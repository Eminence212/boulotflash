import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import { SessionService } from './session.service';

@Controller()
export class MeController {
  constructor(private readonly sessions: SessionService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.sessions.getUserForMe(req.userId!);
  }
}
