import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../identity/auth.guard';
import { JobsService } from './jobs.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly jobs: JobsService) {}

  /** Historique du candidat : statut, date, commune, montant de l’offre au moment de la candidature. */
  @Get()
  @UseGuards(AuthGuard)
  list(@Req() req: AuthedRequest) {
    return this.jobs.listMyApplications(req.userId!);
  }

  @Post(':id/withdraw')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  withdraw(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.jobs.withdraw(req.userId!, id);
  }
}
