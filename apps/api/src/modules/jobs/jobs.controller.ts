import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import { JwtService } from '../identity/jwt.service';
import { PhoneRequiredGuard } from '../identity/phone-required.guard';
import { TokenBlacklistService } from '../identity/token-blacklist.service';
import type { JobDraftInput } from './job-fields';
import {
  hasViewedJob,
  rememberViewedJob,
  setJobViewsCookie,
} from './job-view-cookie';
import { JobsService, type PublicJobsQuery } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly jwt: JwtService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  /** Liste publique filtrée (étape 13). */
  @Get()
  async list(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('cityId') cityId?: string,
    @Query('communeId') communeId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('currency') currency?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query: PublicJobsQuery = {
      q,
      cityId,
      communeId,
      categoryId,
      currency,
      date,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    };
    return this.jobs.listPublicJobs(query, await this.optionalUserId(req));
  }

  /** Mes missions (recruteur). */
  @Get('mine')
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  mine(@Req() req: AuthedRequest) {
    return this.jobs.listMine(req.userId!);
  }

  /**
   * Détail : public si statut visible ; propriétaire voit brouillon / revue / rejet.
   * Auth optionnelle (Bearer).
   */
  @Get(':id')
  async get(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ) {
    const userId = await this.optionalUserId(req);
    const seen = hasViewedJob(req.headers.cookie, id);
    const { body, countedView } = await this.jobs.getJob(userId, id, !seen);
    if (countedView) {
      setJobViewsCookie(res, rememberViewedJob(req.headers.cookie, id));
    }
    return body;
  }

  /** Création brouillon. */
  @Post()
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  create(@Req() req: AuthedRequest, @Body() body: JobDraftInput) {
    return this.jobs.createDraft(req.userId!, body ?? {});
  }

  /** Mise à jour brouillon / rejet / modification substantielle. */
  @Put(':id')
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: JobDraftInput,
  ) {
    return this.jobs.updateDraft(req.userId!, id, body ?? {});
  }

  /** Soumission → IN_REVIEW ou PUBLISHED. */
  @Post(':id/submit')
  @HttpCode(200)
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  submit(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.jobs.submit(req.userId!, id);
  }

  /** Republier → nouveau brouillon. */
  @Post(':id/republish')
  @HttpCode(200)
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  republish(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.jobs.republish(req.userId!, id);
  }

  /** Garde candidature (flux complet = étape 15). */
  @Post(':id/applications')
  @HttpCode(200)
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  apply(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.jobs.applyGate(req.userId!, id);
  }

  private async optionalUserId(req: Request): Promise<string | null> {
    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match?.[1]) return null;
    try {
      const claims = await this.jwt.verifyAccess(match[1].trim());
      if (await this.blacklist.isRevoked(claims.jti)) return null;
      return claims.sub;
    } catch {
      return null;
    }
  }
}
