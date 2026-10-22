import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@boulotflash/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = createPrismaClient();

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
