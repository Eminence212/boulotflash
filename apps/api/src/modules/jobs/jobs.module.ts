import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [IdentityModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
