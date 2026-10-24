import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { assertEnvOrExit } from '@boulotflash/contracts';
import { createPrismaClient } from '@boulotflash/database';
import { AppModule } from './app.module';
import { startMatchProfilesWorker } from './processors/match-profiles.processor';
import { startMissionReminderWorker } from './processors/mission-reminder.processor';
import { startSelectionExpiryWorker } from './processors/selection-expiry.processor';

async function bootstrap() {
  assertEnvOrExit();

  const app = await NestFactory.create(AppModule);
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const prisma = createPrismaClient();
    const workers = [
      startSelectionExpiryWorker(prisma, redisUrl),
      startMatchProfilesWorker(prisma, redisUrl),
      await startMissionReminderWorker(prisma, redisUrl),
    ];
    app.enableShutdownHooks();
    process.once('SIGTERM', () => {
      void Promise.all(workers.map((w) => w.close())).then(() => prisma.$disconnect());
    });
  } else {
    console.warn('REDIS_URL absent : ni expiration programmée, ni alerte de correspondance, ni rappel de mission ne seront traités.');
  }
  const port = Number(process.env.WORKER_PORT ?? 3002);
  await app.listen(port, '0.0.0.0');
  console.log(`worker listening on ${port} (processors: selection-offers, match-profiles, mission-reminders)`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
