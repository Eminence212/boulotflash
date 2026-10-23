import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

export type {
  AvailabilitySlot,
  EmployerType,
  JobStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

/**
 * Prisma 7 + adapter-pg (URL hors schema.prisma).
 */
export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to create PrismaClient');
  }
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
