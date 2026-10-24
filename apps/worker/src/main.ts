import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { assertEnvOrExit } from '@boulotflash/contracts';
import { createPrismaClient } from '@boulotflash/database';
import { AppModule } from './app.module';
import { startSelectionExpiryWorker } from './processors/selection-expiry.processor';

async function bootstrap() {
  assertEnvOrExit();

  const app = await NestFactory.create(AppModule);
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const prisma = createPrismaClient();
    const expiry = startSelectionExpiryWorker(prisma, redisUrl);
    app.enableShutdownHooks();
    process.once('SIGTERM', () => {
      void expiry.close().then(() => prisma.$disconnect());
    });
  } else {
    console.warn('REDIS_URL absent : aucune expiration programmée ne sera traitée.');
  }
  const port = Number(process.env.WORKER_PORT ?? 3002);
  await app.listen(port, '0.0.0.0');
  console.log(`worker listening on ${port} (processor: selection-offers)`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
