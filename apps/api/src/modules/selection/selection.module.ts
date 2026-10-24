import { DynamicModule, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { testHooksEnabled } from './clock.service';
import { SelectionQueueService } from './selection-queue.service';
import { SelectionController } from './selection.controller';
import { SelectionService } from './selection.service';
import { IdempotencyService } from './idempotency.service';
import {
  AdminParticipationController,
  ParticipationController,
} from './participation.controller';
import { ParticipationService } from './participation.service';
import { TestHooksController } from './test-hooks.controller';

@Module({})
export class SelectionModule {
  /** `/test/clock` et `/test/run-expirations` n’existent qu’avec ENABLE_TEST_HOOKS. */
  static register(): DynamicModule {
    return {
      module: SelectionModule,
      imports: [IdentityModule, RedisCacheModule],
      controllers: [
        SelectionController,
        ParticipationController,
        AdminParticipationController,
        ...(testHooksEnabled() ? [TestHooksController] : []),
      ],
      providers: [SelectionQueueService, SelectionService, IdempotencyService, ParticipationService],
    };
  }
}
