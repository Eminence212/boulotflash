import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import { PhoneRequiredGuard } from '../identity/phone-required.guard';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  /** Liste publique minimale (étape 11) — recherche complète = étape 13. */
  @Get()
  list() {
    return this.jobs.listPublicJobs();
  }

  /** Garde publication (étape 11) — formulaire complet = étape 12. */
  @Post()
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  create(@Req() req: AuthedRequest) {
    return this.jobs.createJobGate(req.userId!);
  }

  /** Garde candidature (étape 11) — flux complet = étape 15. */
  @Post(':id/applications')
  @UseGuards(AuthGuard, PhoneRequiredGuard)
  apply(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.jobs.applyGate(req.userId!, id);
  }
}
