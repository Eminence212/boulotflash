# Versions retenues le 21 octobre 2026

Numéros lus ce jour sur les registres publics. Aucun numéro n’a été choisi de mémoire.

| Outil | Version | Source |
| --- | --- | --- |
| Node.js LTS | 24.22.1 (Krypton) | `https://nodejs.org/dist/index.json`, première entrée `lts` |
| Image Node | `node:24.22.0-bookworm` | `24.22.1-bookworm` existe sur Docker Hub mais son index n’a aucun manifeste de plateforme (`no match for platform`). `24.22.0-bookworm` a `linux/amd64`, qui est l’architecture de cette machine. |
| pnpm | 12.14.0 | `npm view pnpm version` |
| Next.js | 16.4.2 | `npm view next version` |
| React | 19.3.1 | `npm view react version` |
| NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | 12.2.0 | `npm view` |
| `@nestjs/cli` | 12.0.10 | dernière étiquette `latest` |
| `@nestjs/config` | non installé | `latest` est 12.0.1, inutile à cette étape |
| Prisma et `@prisma/client` | 7.10.1 | L’étiquette `latest` de `prisma` est `8.0.0-rc.24`, une préversion. La dernière stable est l’étiquette `prev`, identique à `@prisma/client`. Pas de schéma métier dans cette étape. |
| Mantine (`@mantine/core`, `@mantine/hooks`) | 9.7.3 | `npm view` |
| Tailwind CSS et `@tailwindcss/postcss` | 4.3.3 | `npm view` |
| PostCSS | 8.5.31 | `npm view` |
| BullMQ | 6.4.0 | `npm view` |
| Zod | 4.6.7 | noté, pas encore branché |
| Jest | 30.5.2 | `npm view` |
| TypeScript | 6.0.3 | Dernière 6.x. La 7.0.2 est l’étiquette `latest`, mais elle ne fournit plus l’API du compilateur : le CLI NestJS refuse de compiler. La 7.1 doit la rétablir. |
| PostgreSQL | `postgres:18.6-bookworm` | 19 n’existe qu’en `19rc1` |
| Redis | `redis:8.10.2` | Docker Hub |
| Caddy | `caddy:2.11.7` | Docker Hub, HTTP 200 sur l’étiquette |
| MinIO | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` | Dernière étiquette Quay publiée comme image. `RELEASE.2025-10-15T17-29-55Z` est une release source : ses notes disent de construire l’image soi-même, elle n’est pas sur Quay. Le 21 octobre 2026, un `docker pull` anonyme de Quay répond `401 UNAUTHORIZED`, y compris pour septembre. L’image de septembre est déjà présente sur cette machine. Compose utilise `pull_policy: if_not_present` pour ne pas redemander Quay. Pas l’étiquette `latest`. |

Les tests de cette étape tournent avec Jest 30.5.2 : garde de démarrage et égalité des couleurs de statut.

Étape 06 : `argon2` 0.45.1 (`npm view argon2 version`) pour le hachage argon2id des mots de passe admin de démonstration. `pg` 8.23.1, déjà retenu, est aussi la dépendance du script de seed.

Étape 07 : `@aws-sdk/s3-request-presigner` 3.1154.0, même ligne que `@aws-sdk/client-s3` (`npm view @aws-sdk/s3-request-presigner version`).

Étape 08 : `jose` 6.2.13 (`npm view jose version`) pour le jeton d'accès HS256. Durée d'hypothèse D17, non validée : accès 15 minutes, refresh 30 jours. Le `JWT_SECRET` du fichier d'exemple est refusé quand `APP_ENV=production`.

Étape 08–09 (auth OAuth) : pas d’OTP public. OAuth **toujours réel** (D34) : Google Identity (ID token / code) et Meta Graph (Facebook + Instagram). Aucun `OAUTH_ADAPTER=simulated`, aucun jeton `demo:`. Secrets obligatoires au démarrage : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET`. Complétion profil si champs absents (BF-AUTH-12). `GOOGLE_EMAIL_POLICY=verified_google` (D10). Guide : [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md). D29–D35 non validés terrain.

Étape 10 : pas de bibliothèque TOTP. Le code à 6 chiffres est l'algorithme RFC 6238, HMAC-SHA1, pas de 30 secondes, calculé avec `node:crypto`. Le secret est chiffré AES-256-GCM avec `TOTP_ENCRYPTION_KEY`. `argon2` 0.45.1, déjà retenu à l'étape 06, vérifie le mot de passe. D18 reste non validé : TOTP, pas de SMS. `TOTP_ADAPTER=fixed` et la clé locale sont refusés quand `APP_ENV=production`.

Étape 11 : aucune dépendance nouvelle. Le mode actif est une colonne `users.active_mode`. L'abonnement est créé `ACTIVE` avec `ends_at` null dans la même transaction que le profil recruteur.

Étape 12 : aucune dépendance nouvelle. La politique d'offre (`job-policy`) et les transitions brouillon → revue → publié restent dans `@boulotflash/contracts` et le module Nest `jobs`. Le droit `FREE` `POST` est créé `USED` dans la même transaction que la soumission.

Étape 13 : aucune dépendance nouvelle. `ioredis` 6.0.0, déjà retenu, cache la liste publique sous `jobs:public:v1:*`. Le DTO public et la liste noire sont dans `@boulotflash/contracts` (`public-job`).

Chiffrement au repos de l'image `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`, d'après la référence MinIO des réglages KES (clé statique d'évaluation, pas un KMS de production) et un guide vérifié sur cette étiquette :

```
MINIO_KMS_SECRET_KEY=<nom>:<clé base64 de 32 octets>
```

Puis, une fois le serveur démarré, le chiffrement par défaut du bucket :

```
aws --endpoint-url http://s3:9000 s3api put-bucket-encryption \
  --bucket <bucket> \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

L'API envoie le `put-bucket-encryption` au démarrage. `PutBucketCors` répond `NotImplemented` sur cette image. Le CORS est donc limité par le réglage du serveur `MINIO_API_CORS_ALLOW_ORIGIN`, à l'origine du web. La clé locale du fichier d'exemple est refusée quand `APP_ENV=production`. La documentation MinIO dit de ne pas garder cette clé statique au-delà d'une évaluation.
