import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { AdminJobReviewController } from './admin-job-review.controller';
import { ApplicationsController } from './applications.controller';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { NominatimGeocoder } from './nominatim-geocoder';
import { PublishersController } from './publishers.controller';

@Module({
  imports: [IdentityModule, RedisCacheModule],
  controllers: [
    JobsController,
    ApplicationsController,
    AdminJobReviewController,
    PublishersController,
  ],
  providers: [JobsService, NominatimGeocoder],
  exports: [JobsService],
})
export class JobsModule {}
