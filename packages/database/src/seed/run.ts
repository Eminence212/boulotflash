/**
 * CLI : pnpm --filter @boulotflash/database seed
 * Env : DATABASE_URL, SEED_DEMO, SEED_ACTIVATE_DEMO_COMMUNES, TOTP_ADAPTER
 */
import { createPrismaClient } from '../client';
import { runSeed } from './index';

async function main() {
  const prisma = createPrismaClient();
  try {
    await runSeed(prisma, { allowDemoAccounts: true });
    console.log('seed OK');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
