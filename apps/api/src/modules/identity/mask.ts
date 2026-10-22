/** Masque un e-mail pour les journaux (jamais le jeton). */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '(none)';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local[0] ?? '*';
  return `${head}***@${domain}`;
}
