import { HttpException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lockJobRow } from '@boulotflash/database';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
export type Outcome = { httpStatus: number; body: Record<string, unknown> };

function fail(httpStatus: number, code: string, message: string): never {
  throw new HttpException({ code, message }, httpStatus);
}

function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/** Idempotence des POST de sélection et de déclaration, sous le verrou de l’offre concernée. */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotence (api.md) : même clé + même requête → réponse enregistrée ; même clé + autre requête → 409.
   * La clé est écrite dans la même transaction que l’effet : un rejeu ne voit jamais un effet sans réponse.
   * Le verrou de l’offre est pris avant de relire la clé : deux requêtes parallèles avec la même clé
   * se sérialisent, et la seconde relit la réponse validée par la première au lieu de rejouer l’effet.
   */
  async run(
    userId: string,
    rawKey: string | undefined,
    requestHash: string,
    jobId: string,
    run: (tx: Tx) => Promise<Outcome>,
  ): Promise<Outcome> {
    const key = rawKey?.trim() ?? '';
    if (!key || key.length > 200) {
      fail(400, 'VALIDATION', 'Indiquez une clé d’idempotence.');
    }
    const replay = await this.storedOutcome(userId, key, requestHash);
    if (replay) return replay;
    try {
      return await this.prisma.client.$transaction(
        async (tx) => {
          await lockJobRow(tx, jobId);
          const already = await this.storedOutcome(userId, key, requestHash, tx);
          if (already) return already;
          const result = await run(tx);
          await tx.idempotencyKey.create({
            data: {
              userId,
              key,
              requestHash,
              responseCode: result.httpStatus,
              responseBody: result.body as Prisma.InputJsonValue,
            },
          });
          return result;
        },
        { timeout: 15_000, maxWait: 15_000 },
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        const again = await this.storedOutcome(userId, key, requestHash);
        if (again) return again;
        // Collision sur un index métier (ex. une seule proposition PENDING par candidature).
        fail(409, 'VALIDATION', 'Une demande identique est déjà en cours pour cet élément.');
      }
      throw err;
    }
  }

  private async storedOutcome(
    userId: string,
    key: string,
    requestHash: string,
    db: Tx = this.prisma.client,
  ): Promise<Outcome | null> {
    const stored = await db.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!stored) return null;
    if (stored.requestHash !== requestHash) {
      fail(409, 'VALIDATION', 'Cette clé d’idempotence a déjà servi pour une autre demande.');
    }
    return {
      httpStatus: stored.responseCode,
      body: (stored.responseBody ?? {}) as Record<string, unknown>,
    };
  }
}
