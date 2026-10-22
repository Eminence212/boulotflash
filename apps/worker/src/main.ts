import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { assertEnvOrExit } from '@boulotflash/contracts';
import { AppModule } from './app.module';

async function bootstrap() {
  assertEnvOrExit();

  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.WORKER_PORT ?? 3002);
  await app.listen(port, '0.0.0.0');
  console.log(`worker listening on ${port} (no processors yet — étape 04)`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
