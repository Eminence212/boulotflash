import type { PrismaClient } from '@prisma/client';

/** Version juridique validée (D24 — 22 octobre 2026). */
export const LEGAL_DOCS_VERSION = '0.1';

const TERMS_BODY = `# Conditions d’utilisation — BoulotFlash

Version ${LEGAL_DOCS_VERSION} — validée localement (D24).

Vous devez avoir 18 ans révolus. Connexion via Google, Facebook ou Instagram.
BoulotFlash facilite la mise en relation pour des missions courtes ; le salaire
se règle entre les parties. Texte complet : /conditions
`;

const PRIVACY_BODY = `# Politique de confidentialité — BoulotFlash

Version ${LEGAL_DOCS_VERSION} — validée localement (D24).

Données utilisées pour la mise en relation, la confiance et le fonctionnement
technique. Pas de revente du numéro. Texte complet : /confidentialite
`;

/**
 * Sème TERMS + PRIVACY (idempotent) pour `terms_acceptances` à la connexion.
 */
export async function seedLegalDocuments(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  await prisma.termsDocument.upsert({
    where: {
      kind_version: { kind: 'TERMS', version: LEGAL_DOCS_VERSION },
    },
    create: {
      kind: 'TERMS',
      version: LEGAL_DOCS_VERSION,
      bodyMd: TERMS_BODY,
      publishedAt: now,
    },
    update: {
      bodyMd: TERMS_BODY,
      publishedAt: now,
    },
  });
  await prisma.termsDocument.upsert({
    where: {
      kind_version: { kind: 'PRIVACY', version: LEGAL_DOCS_VERSION },
    },
    create: {
      kind: 'PRIVACY',
      version: LEGAL_DOCS_VERSION,
      bodyMd: PRIVACY_BODY,
      publishedAt: now,
    },
    update: {
      bodyMd: PRIVACY_BODY,
      publishedAt: now,
    },
  });
}
