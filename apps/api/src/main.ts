import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { assertEnvOrExit } from '@boulotflash/contracts';
import { createPrismaClient, runSeed } from '@boulotflash/database';
import { AppModule } from './app.module';

async function bootstrap() {
  assertEnvOrExit();

  const prisma = createPrismaClient();
  try {
    // Référentiel au démarrage ; comptes démo seulement si SEED_DEMO déjà dans l’env.
    await runSeed(prisma, { allowDemoAccounts: true });
  } finally {
    await prisma.$disconnect();
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`api listening on ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
