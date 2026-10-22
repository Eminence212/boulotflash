/**
 * Normalise un téléphone pilote Kinshasa (+243 + 9 chiffres).
 */
export function normalizePilotPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('243') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+243${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+243${digits}`;
  }
  return null;
}

export function isPilotPhone(value: string): boolean {
  return /^\+243\d{9}$/.test(value);
}
