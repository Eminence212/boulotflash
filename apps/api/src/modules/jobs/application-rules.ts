const DAY_MS = 24 * 60 * 60 * 1000;

export const ALREADY_APPLIED_MESSAGE =
  'Vous avez déjà postulé à cette mission.';
export const DAILY_LIMIT_MESSAGE = 'Vous avez atteint la limite du jour.';
export const UNAVAILABLE_MESSAGE =
  'Activez votre disponibilité pour postuler.';

/** Une candidature dans les 24 heures compte, y compris si elle a été retirée. */
export function countsTowardDailyLimit(
  appliedAt: Date,
  now: Date,
): boolean {
  return now.getTime() - appliedAt.getTime() < DAY_MS;
}

export function dailyLimitReached(count: number, limit: number): boolean {
  return count >= limit;
}

export function isOwnJob(employerId: string, workerId: string): boolean {
  return employerId === workerId;
}

export function offerAcceptsApplications(input: {
  status: string;
  applyDeadline: Date;
  placesRemaining: number;
  now: Date;
}): boolean {
  return (
    input.status === 'PUBLISHED' &&
    input.placesRemaining > 0 &&
    input.applyDeadline > input.now
  );
}

/** Toute ligne existante, retirée comprise, bloque une nouvelle candidature. */
export function alreadyAppliedBlock(existingStatus: string | null): {
  code: 'ALREADY_APPLIED';
  message: string;
} | null {
  if (!existingStatus) return null;
  return { code: 'ALREADY_APPLIED', message: ALREADY_APPLIED_MESSAGE };
}

export function canWithdraw(status: string): boolean {
  return status === 'SUBMITTED' || status === 'SHORTLISTED';
}

/** Même clé et même corps : rejouer. Même clé et autre corps : conflit. */
export function idempotencyDecision(
  storedHash: string | null,
  requestHash: string,
): 'fresh' | 'replay' | 'conflict' {
  if (!storedHash) return 'fresh';
  return storedHash === requestHash ? 'replay' : 'conflict';
}

export function applicationRequestHash(body: {
  availabilityConfirmed: boolean;
  message: string;
}): string {
  return JSON.stringify({
    availabilityConfirmed: body.availabilityConfirmed,
    message: body.message,
  });
}
