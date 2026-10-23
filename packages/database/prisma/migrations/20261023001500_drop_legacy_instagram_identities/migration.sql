-- Après le passage Instagram → GitHub, des lignes `instagram` peuvent rester.
-- Prisma (enum sans instagram) plante au read de auth_identities → 500 OAuth.
DELETE FROM "auth_identities" WHERE "provider"::text = 'instagram';
