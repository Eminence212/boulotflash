import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import { PhoneRequiredGuard } from './phone-required.guard';
import {
  ProfileService,
  type EmployerProfileInput,
  type WorkerProfileInput,
  type AvailabilityInput,
} from './profile.service';
import { SessionService } from './session.service';

@Controller()
export class MeController {
  constructor(
    private readonly sessions: SessionService,
    private readonly profiles: ProfileService,
  ) {}

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

  @Put('me/worker-profile')
  @UseGuards(AuthGuard)
  putWorkerProfile(
    @Req() req: AuthedRequest,
    @Body() body: WorkerProfileInput,
  ) {
    return this.profiles.putWorkerProfile(req.userId!, body ?? {});
  }

  @Put('me/worker-profile/availability')
  @UseGuards(AuthGuard)
  putWorkerAvailability(
    @Req() req: AuthedRequest,
    @Body()
    body: { isAvailable?: boolean; availability?: AvailabilityInput[] },
  ) {
    return this.profiles.putWorkerAvailability(req.userId!, body ?? {});
  }

  @Post('me/employer-profile')
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  createEmployerProfile(
    @Req() req: AuthedRequest,
    @Body() body: EmployerProfileInput,
  ) {
    return this.profiles.createEmployerProfile(req.userId!, body ?? {});
  }

  @Put('me/employer-profile')
  @UseGuards(AuthGuard)
  putEmployerProfile(
    @Req() req: AuthedRequest,
    @Body() body: EmployerProfileInput,
  ) {
    return this.profiles.putEmployerProfile(req.userId!, body ?? {});
  }

  @Post('me/mode')
  @UseGuards(AuthGuard)
  setMode(
    @Req() req: AuthedRequest,
    @Body() body: { mode?: string },
  ) {
    return this.profiles.setMode(req.userId!, body?.mode);
  }
}
