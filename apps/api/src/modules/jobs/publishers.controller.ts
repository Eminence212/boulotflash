import { Controller, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('publishers')
export class PublishersController {
  constructor(private readonly jobs: JobsService) {}

  /** Profil public du recruteur — nom, photo, présentation, missions publiées. */
  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobs.getPublicPublisher(id);
  }
}
