<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 05 — Migrations, statuts, contraintes de places |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-04-socle-depot-docker-compose.md](etape-04-socle-depot-docker-compose.md) |
| Suivante | [etape-06-referentiels-reglages.md](etape-06-referentiels-reglages.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 05 — Schéma, migrations et codes de statut

**Objectif et résultat visible**

La base contient les tables de [modele-donnees.md](../modele-donnees.md). Aucune route métier. Un script de recette SQL prouve les contraintes d’unicité.

**Exigences couvertes**

CDC §13.3, §14, §9 pour la correspondance des codes. Prépare BF-SEL-03, BF-AD-06, BF-AUTH-04, recette 5 et 13.

**Prérequis et dépendances**

Étape 04. Prisma installé dans `packages/database` à la version notée en étape 04.

**Travaux à réaliser, dans l’ordre**

1. Écrire `schema.prisma` et la migration SQL, y compris les index partiels cités dans le modèle.
2. Déposer `packages/contracts/src/statuses.ts` et `labels.fr.ts` avec la table de correspondance. L’API n’accepte que les codes anglais.
3. Ajouter `packages/database/scripts/check-constraints.sql` qui tente les doublons et doit échouer.
4. Ne pas semer les communes ici.

**Règles techniques et métier**

Une candidature en double sur le même couple échoue en base même si le service oubliait le contrôle. Un second `publication_right` avec le même `payment_id` échoue. Les statuts français avec accent ne sont pas des valeurs de colonne.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 05-A | Migration | Pile démarrée | `docker compose exec api pnpm --filter @boulotflash/database prisma migrate deploy` | Fin sans erreur | `\dt` dans `psql` montre `users`, `jobs`, `applications`, `subscriptions`, `publication_rights`, `job_profile_alerts` |
| 05-B | Unicité candidature | Deux UUID de test insérés | Exécuter deux `INSERT` identiques dans `applications` pour le même couple | Le second échoue sur `applications_pair_uq` | La première ligne reste |
| 05-C | Unicité de droit | Un paiement confirmé de test | Deux `INSERT` de droits avec le même `payment_id` | Le second échoue | Un droit sans `payment_id` et `source = FREE` passe |
| 05-D | Téléphone unique partiel | Deux users | Second insert du même `phone` | Échec. Deux `phone` null passent |  |
| 05-E | Libellés | Fichier contracts | Lire `OFFERED` | Le libellé français est « Sélection proposée » | `PRÉSÉLECTIONNÉE` n’est pas une valeur d’enum SQL |

**Tests automatisés nécessaires**

Test d’intégration Jest contre Postgres du Compose : les trois unicités et le refus d’un statut inconnu.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `05-A` — Migration
- [ ] `05-B` — Unicité candidature
- [ ] `05-C` — Unicité de droit
- [ ] `05-D` — Téléphone unique partiel
- [ ] `05-E` — Libellés

**Livrables et règles**
- [ ] Migration rejouable sur une base vide.
- [ ] Contraintes prouvées par l’échec des doublons.
- [ ] Aucune route métier ajoutée.
- [ ] Tests automatisés exécutés avec succès : Jest : unicités applications / droits / téléphone + statut inconnu refusé.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : unicité partielle « seulement si statut actif » sur `applications`, qui contredirait D02.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 05 : schéma, migration et contrats de statuts. Ne crée pas les routes d’authentification. Fournis la recette 05-A à 05-E et le résultat des tests Jest.

