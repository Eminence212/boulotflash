import { randomUUID } from 'node:crypto';
import pg from 'pg';
import {
  assertKnownStatus,
  FORBIDDEN_STORED_FR_CODES,
  labelFr,
} from '@boulotflash/contracts';

const databaseUrl = process.env.DATABASE_URL;

const describeDb = databaseUrl ? describe : describe.skip;

async function withClient(
  run: (client: pg.Client) => Promise<void>,
): Promise<void> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL required');
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    await run(client);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

async function seedJobGraph(client: pg.Client): Promise<{
  employerId: string;
  workerId: string;
  jobId: string;
}> {
  const cityId = randomUUID();
  const communeId = randomUUID();
  const categoryId = randomUUID();
  const employerId = randomUUID();
  const workerId = randomUUID();
  const jobId = randomUUID();

  await client.query(
    `INSERT INTO cities (id, name, is_active) VALUES ($1, $2, false)`,
    [cityId, `city-${cityId.slice(0, 8)}`],
  );
  await client.query(
    `INSERT INTO communes (id, city_id, name, is_active) VALUES ($1, $2, $3, false)`,
    [communeId, cityId, `commune-${communeId.slice(0, 8)}`],
  );
  await client.query(
    `INSERT INTO categories (id, slug, name, family, is_sensitive, sensitive_if_home, is_active, sort_order)
     VALUES ($1, $2, $3, 'test', false, false, true, 0)`,
    [categoryId, `cat-${categoryId.slice(0, 8)}`, 'Cat test'],
  );
  await client.query(
    `INSERT INTO users (id, status, locale, created_at, updated_at)
     VALUES ($1, 'INCOMPLETE', 'fr', now(), now()), ($2, 'INCOMPLETE', 'fr', now(), now())`,
    [employerId, workerId],
  );
  await client.query(
    `INSERT INTO jobs (
      id, employer_id, title, description, category_id, commune_id,
      start_at, duration_hours, workers_needed, amount, currency, pay_unit, pay_channel,
      apply_deadline, selection_deadline, status, is_featured, at_private_home,
      transport_support, meals_support, equipment_support, created_at, updated_at
    ) VALUES (
      $1, $2, 'Job test', 'desc', $3, $4,
      now() + interval '2 days', 4, 1, 10000, 'CDF', 'DAY', 'CASH',
      now() + interval '1 day', now() + interval '1 day', 'DRAFT', false, false,
      false, false, false, now(), now()
    )`,
    [jobId, employerId, categoryId, communeId],
  );

  return { employerId, workerId, jobId };
}

describeDb('contraintes d’unicité (Postgres)', () => {
  it('refuse un second applications pour le même couple (applications_pair_uq)', async () => {
    await withClient(async (client) => {
      const { workerId, jobId } = await seedJobGraph(client);
      await client.query(
        `INSERT INTO applications (id, job_id, worker_id, status, applied_at, updated_at)
         VALUES ($1, $2, $3, 'SUBMITTED', now(), now())`,
        [randomUUID(), jobId, workerId],
      );
      await expect(
        client.query(
          `INSERT INTO applications (id, job_id, worker_id, status, applied_at, updated_at)
           VALUES ($1, $2, $3, 'SUBMITTED', now(), now())`,
          [randomUUID(), jobId, workerId],
        ),
      ).rejects.toMatchObject({ constraint: 'applications_pair_uq' });
    });
  });

  it('refuse un second publication_rights pour le même payment_id (rights_payment_uq)', async () => {
    await withClient(async (client) => {
      const { employerId } = await seedJobGraph(client);
      const paymentId = randomUUID();
      await client.query(
        `INSERT INTO payments (id, user_id, purpose, amount, currency, method, status, created_at)
         VALUES ($1, $2, 'JOB_POST', 5000, 'CDF', 'MANUAL', 'CONFIRMED', now())`,
        [paymentId, employerId],
      );
      await client.query(
        `INSERT INTO publication_rights (id, employer_id, payment_id, source, type, status, created_at)
         VALUES ($1, $2, $3, 'PAID', 'POST', 'AVAILABLE', now())`,
        [randomUUID(), employerId, paymentId],
      );
      await client.query('SAVEPOINT dup_right');
      await expect(
        client.query(
          `INSERT INTO publication_rights (id, employer_id, payment_id, source, type, status, created_at)
           VALUES ($1, $2, $3, 'PAID', 'POST', 'AVAILABLE', now())`,
          [randomUUID(), employerId, paymentId],
        ),
      ).rejects.toMatchObject({ constraint: 'rights_payment_uq' });
      await client.query('ROLLBACK TO SAVEPOINT dup_right');

      await expect(
        client.query(
          `INSERT INTO publication_rights (id, employer_id, payment_id, source, type, status, created_at)
           VALUES ($1, $2, NULL, 'FREE', 'POST', 'AVAILABLE', now())`,
          [randomUUID(), employerId],
        ),
      ).resolves.toBeDefined();
    });
  });

  it('refuse un phone non null en double ; accepte plusieurs phone null (users_phone_uq)', async () => {
    await withClient(async (client) => {
      const phone = `+24381${Date.now().toString().slice(-8)}`;
      await client.query(
        `INSERT INTO users (id, phone, status, locale, created_at, updated_at)
         VALUES ($1, $2, 'INCOMPLETE', 'fr', now(), now())`,
        [randomUUID(), phone],
      );
      await client.query('SAVEPOINT dup_phone');
      await expect(
        client.query(
          `INSERT INTO users (id, phone, status, locale, created_at, updated_at)
           VALUES ($1, $2, 'INCOMPLETE', 'fr', now(), now())`,
          [randomUUID(), phone],
        ),
      ).rejects.toMatchObject({ constraint: 'users_phone_uq' });
      await client.query('ROLLBACK TO SAVEPOINT dup_phone');

      await expect(
        client.query(
          `INSERT INTO users (id, phone, status, locale, created_at, updated_at)
           VALUES ($1, NULL, 'INCOMPLETE', 'fr', now(), now()),
                  ($2, NULL, 'INCOMPLETE', 'fr', now(), now())`,
          [randomUUID(), randomUUID()],
        ),
      ).resolves.toBeDefined();
    });
  });
});

describe('statuts contracts (D08)', () => {
  it('assertKnownStatus refuse un code FR accentué (PRÉSÉLECTIONNÉE)', () => {
    expect(() =>
      assertKnownStatus('applications', 'PRÉSÉLECTIONNÉE'),
    ).toThrow(/Statut inconnu/);
    expect(FORBIDDEN_STORED_FR_CODES).toContain('PRÉSÉLECTIONNÉE');
  });

  it('OFFERED → « Sélection proposée »', () => {
    expect(labelFr('OFFERED')).toBe('Sélection proposée');
    expect(() => assertKnownStatus('applications', 'OFFERED')).not.toThrow();
  });
});
