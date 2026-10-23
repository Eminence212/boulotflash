import { Module } from '@nestjs/common';
import { PublicJobsCacheService } from './public-jobs-cache.service';

@Module({
  providers: [PublicJobsCacheService],
  exports: [PublicJobsCacheService],
})
export class RedisCacheModule {}
