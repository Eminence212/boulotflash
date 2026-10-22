import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import { PhoneRequiredGuard } from './phone-required.guard';
import { SessionService } from './session.service';

@Controller()
export class MeController {
  constructor(private readonly sessions: SessionService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.sessions.getUserForMe(req.userId!);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  patchMe(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      displayName?: string;
      phone?: string;
      avatarUrl?: string | null;
    },
  ) {
    return this.sessions.patchMe(req.userId!, body ?? {});
  }

  /** Probe garde téléphone (D31) — prêt pour candidature / publication. */
  @Get('me/phone-gate')
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  phoneGate(@Req() req: AuthedRequest) {
    return { ok: true as const, userId: req.userId };
  }
}
