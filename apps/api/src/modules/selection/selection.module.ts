import { DynamicModule, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { testHooksEnabled } from './clock.service';
import { SelectionQueueService } from './selection-queue.service';
import { SelectionController } from './selection.controller';
import { SelectionService } from './selection.service';
import { TestHooksController } from './test-hooks.controller';

@Module({})
export class SelectionModule {
  /** `/test/clock` et `/test/run-expirations` n’existent qu’avec ENABLE_TEST_HOOKS. */
  static register(): DynamicModule {
    return {
      module: SelectionModule,
      imports: [IdentityModule, RedisCacheModule],
      controllers: testHooksEnabled()
        ? [SelectionController, TestHooksController]
        : [SelectionController],
      providers: [SelectionQueueService, SelectionService],
    };
  }
}
