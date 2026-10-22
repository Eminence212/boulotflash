# Versions retenues le 22 octobre 2026 (étape 04)

Numéros lus ce jour sur les registres publics (`npm view`, Docker Hub). Aucun numéro n’a été choisi de mémoire.

| Outil                                                                 | Version                                            | Source                                                                                                        |
| --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Node.js LTS                                                           | 24.22.1 (Krypton)                                  | `https://nodejs.org/dist/index.json`, première entrée `lts`                                                   |
| Image Node                                                            | `node:24.22.0-bookworm`                            | `24.22.1-bookworm` sans manifeste exploitable ici ; `24.22.0-bookworm` OK                                     |
| pnpm                                                                  | 12.15.0                                            | `npm view pnpm version` (22 oct 2026)                                                                         |
| Next.js                                                               | 16.4.2                                             | `npm view next version`                                                                                       |
| React / React DOM                                                     | 19.3.1                                             | `npm view react version`                                                                                      |
| NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | 12.2.0                                             | `npm view`                                                                                                    |
| `@nestjs/cli`                                                         | 12.0.10                                            | étiquette `latest`                                                                                            |
| Prisma et `@prisma/client`                                            | 7.10.1                                             | `latest` = RC 8.x ; stable = étiquette `prev` / `@prisma/client`. Pas de schéma métier à cette étape          |
| Mantine (`@mantine/core`, `@mantine/hooks`)                           | 9.7.3                                              | `npm view`                                                                                                    |
| `@tabler/icons-react`                                                 | 3.49.0                                             | `npm view`                                                                                                    |
| Tailwind CSS et `@tailwindcss/postcss`                                | 4.3.3                                              | `npm view`                                                                                                    |
| PostCSS                                                               | 8.5.31                                             | `npm view`                                                                                                    |
| BullMQ                                                                | 6.4.0                                              | noté pour étapes suivantes                                                                                    |
| ioredis                                                               | 6.0.0                                              | `npm view`                                                                                                    |
| `pg`                                                                  | 8.23.1                                             | `npm view`                                                                                                    |
| `@aws-sdk/client-s3`                                                  | 3.1155.0                                           | `npm view` (22 oct)                                                                                           |
| Zod                                                                   | 4.6.7                                              | noté, pas encore branché                                                                                      |
| Jest                                                                  | 30.5.2                                             | `npm view`                                                                                                    |
| TypeScript                                                            | 6.0.3                                              | Dernière 6.x. La 7.x `latest` casse le CLI Nest                                                               |
| PostgreSQL                                                            | `postgres:18.6-bookworm`                           | Docker Hub                                                                                                    |
| Redis                                                                 | `redis:8.10.2`                                     | Docker Hub                                                                                                    |
| Caddy                                                                 | `caddy:2.11.7`                                     | Docker Hub                                                                                                    |
| MinIO                                                                 | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` | Pas `latest`. `pull_policy: if_not_present`                                                                   |
| MinIO client (`mc`)                                                   | `minio/mc:latest` (`pull_policy: if_not_present`)  | Quay mc daté = 401 anonyme le 22 oct 2026 ; image Docker Hub déjà présente localement pour l’init des buckets |

Les tests de cette étape tournent avec Jest 30.5.2 : garde de démarrage (`@boulotflash/contracts`) et égalité des couleurs de statut (`@boulotflash/web`).

Étape 06 : `argon2` 0.45.1 (`npm view argon2 version`) pour le hachage argon2id des mots de passe admin de démonstration. `pg` 8.23.1, déjà retenu, est aussi la dépendance du script de seed.

Étape 07 : `@aws-sdk/s3-request-presigner` aligné sur `@aws-sdk/client-s3`.

Étape 08 : `jose` pour le jeton d'accès HS256. Durée d'hypothèse D17, non validée : accès 15 minutes, refresh 30 jours. Le `JWT_SECRET` du fichier d'exemple est refusé quand `APP_ENV=production`.

Étape 08–09 (auth OAuth) : pas d’OTP public. OAuth **toujours réel** (D34) : Google Identity et Meta Graph (Facebook + Instagram). Aucun `OAUTH_ADAPTER=simulated`. Secrets obligatoires au démarrage. Guide : [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md).

Étape 10 : TOTP RFC 6238 via `node:crypto`. D18 non validé. `TOTP_ADAPTER=fixed` refusé en production.

Chiffrement au repos MinIO (`quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`, évaluation locale) :

```
# Doc image / MinIO Server : KMS auto via variable d’environnement (pas de KES séparé en local).
MINIO_KMS_SECRET_KEY=<nom>:<clé base64 de 32 octets>
```

Exemple Compose : `MINIO_KMS_SECRET_KEY=boulotflash-local:<32 octets base64>`. Refusé en production.  
`PutBucketCors` NotImplemented sur cette image — CORS via `MINIO_API_CORS_ALLOW_ORIGIN`.  
Buckets privés au boot : `mc anonymous set none` sur media et private (`docker/minio-init.sh`).

Signature publique : MinIO refuse un path prefix dans le calcul SigV4. L’API signe sur l’origine de `S3_PUBLIC_ENDPOINT` puis réinjecte le préfixe `/s3` (strip Caddy) pour que le client passe par le proxy.
