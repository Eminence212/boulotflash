import {
  Body,
  Controller,
  Get,
  Header,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard, type AuthedRequest } from './auth.guard';
import { isGoogleAvatarUrl } from './oauth-picture';
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
    private readonly prisma: PrismaService,
  ) {}

  /** Photo Gmail servie par l’API : le navigateur n’affiche pas l’URL Google. */
  @Get('avatars/:userId')
  @Header('Cache-Control', 'public, max-age=3600')
  async googleAvatar(@Param('userId') userId: string): Promise<StreamableFile> {
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Photo introuvable.' }, 404);
    }
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const source = user?.avatarUrl ?? null;
    if (!isGoogleAvatarUrl(source)) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Photo introuvable.' }, 404);
    }
    const upstream = await fetch(source, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'image/*' },
    }).catch(() => null);
    const type = upstream?.headers.get('content-type') ?? '';
    let finalHost = '';
    try {
      finalHost = upstream ? new URL(upstream.url).hostname.toLowerCase() : '';
    } catch {
      finalHost = '';
    }
    const googleHost =
      finalHost === 'googleusercontent.com' ||
      finalHost.endsWith('.googleusercontent.com');
    if (!upstream?.ok || !type.startsWith('image/') || !googleHost) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Photo introuvable.' }, 404);
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 2_000_000) {
      throw new HttpException({ code: 'NOT_FOUND', message: 'Photo introuvable.' }, 404);
    }
    return new StreamableFile(bytes, {
      type,
      disposition: 'inline',
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.sessions.getUserForMe(req.userId!);
  }

  /** Position actuelle, seulement après accord. Le refus efface les coordonnées. */
  @Put('me/location')
  @UseGuards(AuthGuard)
  setLocation(
    @Req() req: AuthedRequest,
    @Body()
    body: { consent?: boolean; latitude?: number; longitude?: number },
  ) {
    return this.sessions.setCurrentLocation(req.userId!, body ?? {});
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
