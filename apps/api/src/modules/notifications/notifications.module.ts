import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MatchQueueService } from './match-queue.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, MatchQueueService],
  exports: [MatchQueueService],
})
export class NotificationsModule {}
