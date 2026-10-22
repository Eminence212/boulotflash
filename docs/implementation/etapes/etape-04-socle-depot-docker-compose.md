<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 04 — Socle du dépôt et Docker Compose |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-03-maquettes-mobiles.md](etape-03-maquettes-mobiles.md) |
| Suivante | [etape-05-migrations-statuts-contraintes.md](etape-05-migrations-statuts-contraintes.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 04 — Socle du dépôt, Docker Compose et environnements

**Objectif et résultat visible**

`docker compose up` démarre `web`, `api`, `worker`, `postgres`, `redis`, `s3`, `proxy`. Le web affiche une page « BoulotFlash » vide de métier. L’API répond sur `/api/v1/health`.

**Exigences couvertes**

CDC §13.1, §13.2, §13.4, §13.6. Santé des services, pas encore les règles métier.

**Prérequis et dépendances**

Étapes 01 à 03. Versions : au moment de l’installation, prendre la dernière version stable publiée de Node LTS, pnpm, Next.js, NestJS, Prisma, Mantine, Tailwind, BullMQ, Caddy, et une étiquette de `quay.io/minio/minio` qui n’est pas `latest`. Les écrire dans le lockfile et dans [VERSIONS.md](../VERSIONS.md). Ne pas recopier un numéro inventé par ce plan.

**Travaux à réaliser, dans l’ordre**

1. Déposer l’arborescence de la section 4 du plan.
2. `docker-compose.yml` avec réseau interne, volumes nommés `postgres-data`, `redis-data`, `s3-data`.
3. Seul le proxy publie un port vers l’hôte. Les autres services n’ont pas de `ports:` publics. En développement, le proxy peut exposer 80 et 443.
4. `.env.example` sans secret réel : noms `DATABASE_URL`, `REDIS_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, buckets `boulotflash-dev-media` et `boulotflash-dev-private`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET`, `ENABLE_TEST_HOOKS=true`, `SEED_DEMO=false`. Pas de `OAUTH_ADAPTER` (D34). **Pas de variables FCM / Firebase Messaging** (D36). Voir [AUTH_OAUTH_PROVIDERS.md](../AUTH_OAUTH_PROVIDERS.md).
5. Garde au démarrage de l’API et du worker : absence ou placeholder des quatre secrets OAuth → arrêt dans **tous** les `APP_ENV`. Si `production` et `ENABLE_TEST_HOOKS` / `SEED_DEMO` vrai → arrêt. Si une variable `FCM_*` ou clé messaging Firebase est présente → arrêt (push hors pilote).
6. Page web minimale qui charge les jetons de l’étape 02 dans le thème Mantine et la config Tailwind (mêmes hex que [design/tokens/tokens.json](../../../design/tokens/tokens.json)). Composants UI via wrappers Mantine + Tabler Icons ([INVENTORY.md](../../../design/components/INVENTORY.md), [ICONS.md](../../../design/components/ICONS.md)). Dépendance `@tabler/icons-react`. Test automatisé : les couleurs de statut sont égales.
7. Caddy route `/` vers `web`, `/api/` vers `api`, `/s3/` vers `s3` pour les URL pré-signées. Ne pas journaliser la query string.

**Règles techniques et métier**

Le fichier Compose est unique. `.env.development`, `.env.test`, `.env.production` ne sont pas commités. `.env.example` l’est.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 04-A | Pile locale | `.env.development` copié depuis l’exemple, secrets locaux factices | `docker compose --env-file .env.development up --build` | Les sept services sont « running » | `curl -s http://localhost/api/v1/health` renvoie postgres, redis et s3 à `ok` |
| 04-B | Ports internes fermés | Pile démarrée | Depuis l’hôte, tenter le port PostgreSQL 5432 | Connexion refusée | Seul le port du proxy répond |
| 04-C | OAuth incomplet / FCM interdit | (1) `.env` sans `GOOGLE_CLIENT_SECRET` ; (2) `.env` avec `FCM_ADAPTER=…` ou clé Firebase messaging | Démarrer `api` | Le processus quitte avant d’écouter dans les deux cas | Journal : secret OAuth manquant ou FCM refusé (D36), sans valeur secrète |
| 04-D | Jetons partagés | Page web vide | Ouvrir `/` | Le titre BoulotFlash utilise la couleur du jeton, pas une couleur en dur | Le test de comparaison JSON / thème passe |
| 04-E | Santé | Pile sans Firebase | Relire `/api/v1/health` | 200 | Aucune dépendance push |

**Tests automatisés nécessaires**

Test unitaire de la garde d’environnement. Test d’égalité des couleurs de statut entre `tokens.json`, le thème Mantine et Tailwind.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `04-A` — Pile locale
- [ ] `04-B` — Ports internes fermés
- [ ] `04-C` — OAuth incomplet / FCM interdit
- [ ] `04-D` — Jetons partagés
- [ ] `04-E` — Santé

**Livrables et règles**
- [ ] `docker compose up` suffit.
- [ ] Santé 200.
- [ ] OAuth sans secrets impossible ; aucune config FCM acceptée (D36).
- [ ] Versions réelles notées dans [VERSIONS.md](../VERSIONS.md).
- [ ] Tests automatisés exécutés avec succès : Garde d’environnement + égalité couleurs tokens / Mantine / Tailwind.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : un secret commité, ou MinIO publié directement sur l’hôte.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 04 : socle, Compose et santé. Vérifie les versions stables du jour et note-les. Ne migre pas le schéma métier et ne commence pas l’étape 05. Fournis la recette 04-A à 04-E.

