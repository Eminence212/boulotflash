/** Erreur métier sans dépendance Nest (testable en Jest CJS). */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
