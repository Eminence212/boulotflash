<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 07 — Socle S3 |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-06-referentiels-reglages.md](etape-06-referentiels-reglages.md) |
| Suivante | [etape-08-sessions-jwt-ecran-oauth.md](etape-08-sessions-jwt-ecran-oauth.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 07 — Socle S3 et séparation des fichiers privés

**Objectif et résultat visible**

Au démarrage, les deux buckets de l’environnement existent, privés. L’API délivre une URL pré-signée PUT. Un fichier de test versé par curl est lisible seulement avec une URL GET courte. Le bucket privé n’est pas listable.

**Exigences couvertes**

CDC §13.5, BF-E-03 pour le rangement privé, recette 8 en préparation. Pas encore les photos de profil métier.

**Prérequis et dépendances**

Étape 04. Étape 05 pour la table qui stockera la clé, même si aucune photo métier n’est branchée.

**Travaux à réaliser, dans l’ordre**

1. Module `apps/api/src/modules/files` : client S3 vers `S3_ENDPOINT` interne, signature avec `S3_PUBLIC_ENDPOINT`.
2. Création des buckets au boot si absents. Accès public bloqué. CORS limité à l’origine du web.
3. Chiffrement au repos activé sur le conteneur MinIO selon la documentation de l’image épinglée. Noter la commande exacte dans [VERSIONS.md](../VERSIONS.md) au moment de l’étape, d’après la doc de cette étiquette, sans l’inventer ici.
4. Route de développement `POST /api/v1/files/dev-presign`, retirée si `ENABLE_TEST_HOOKS` est faux : corps `{ "bucket": "media"|"private", "contentType" }`, réponse `uploadUrl` et `key`.
5. Refuser un type hors JPEG, PNG, WebP pour le média, et hors PDF, JPEG, PNG, WebP pour le privé. Refuser plus de 5 Mo média et 10 Mo privé à la complétion, en lisant la taille réelle de l’objet.
6. Ne pas écrire l’URL en base. Écrire `bucket` et `key` seulement, dans une table `stored_objects` de test ou directement les colonnes prévues.

**Règles techniques et métier**

L’API ne reçoit pas le binaire. Une URL du bucket privé dure 5 minutes. Une URL média dure 15 minutes. Le journal de l’API ne contient pas la query `X-Amz-Signature`.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 07-A | PUT pré-signé | Hooks de test actifs | Demander une URL média, puis `curl -X PUT` un PNG de moins de 5 Mo vers cette URL | 200 du stockage | La base contient la clé, pas l’URL |
| 07-B | GET privé court | Objet dans le bucket privé | Demander l’URL GET, l’ouvrir, attendre 6 minutes, l’ouvrir encore | Première lecture 200, seconde refusée |  |
| 07-C | Bucket non public | Pile démarrée | `curl` l’URL du proxy vers le bucket sans signature | 403 | Le port MinIO n’est pas ouvert sur l’hôte |
| 07-D | Type refusé | URL demandée avec `contentType: text/plain` | Appeler la route | 400 `VALIDATION` | Aucun objet créé |
| 07-E | Taille | Fichier de 6 Mo annoncé comme image | Compléter l’upload | L’API refuse et supprime l’objet | Le bucket ne garde pas le fichier |

**Tests automatisés nécessaires**

Test d’intégration avec le MinIO du Compose : PUT, GET, expiration simulée par une URL signée à 1 seconde, type interdit.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `07-A` — PUT pré-signé
- [ ] `07-B` — GET privé court
- [ ] `07-C` — Bucket non public
- [ ] `07-D` — Type refusé
- [ ] `07-E` — Taille

**Livrables et règles**
- [ ] Deux buckets par environnement.
- [ ] Pas de binaire dans PostgreSQL.
- [ ] URL privée inutilisable après 5 minutes.
- [ ] Tests automatisés exécutés avec succès : Jest MinIO : PUT, GET, expiration courte, type interdit.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : bucket en lecture anonyme, ou signature vers le hostname interne `s3` que le téléphone ne peut pas joindre.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 07 : buckets, URL pré-signées et refus des types. Ne branche pas encore l’avatar du profil. Fournis la recette 07-A à 07-E.

