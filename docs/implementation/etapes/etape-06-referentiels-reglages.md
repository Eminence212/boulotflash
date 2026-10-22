<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 06 — Référentiels et réglages |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-05-migrations-statuts-contraintes.md](etape-05-migrations-statuts-contraintes.md) |
| Suivante | [etape-07-socle-s3.md](etape-07-socle-s3.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 06 — Référentiels, réglages et seed de démonstration

**Objectif et résultat visible**

Les 26 catégories et les 24 communes existent. Toutes les communes sont inactives, sauf si le seed de démo est lancé avec le drapeau explicite. `services_payants` est faux. L’admin n’a pas encore d’écran : la lecture se fait en SQL et par une route interne de lecture.

**Exigences couvertes**

BF-AD-04, BF-AD-11, CDC §6 et §7, recette 4 pour le référentiel. Les communes pilotes ne sont pas choisies.

**Prérequis et dépendances**

Étape 05. Jeu de données.

**Travaux à réaliser, dans l’ordre**

1. Seed idempotent : villes, communes sans latitude inventée, catégories, familles, `is_sensitive`, `sensitive_if_home` pour ménage et lessive.
2. Ligne unique `platform_settings` avec les hypothèses affichées comme telles.
3. `GET /api/v1/catalog/categories?active=1` et `GET /api/v1/catalog/communes?active=1`. Une commune inactive est absente.
4. Seed démo des comptes seulement si `SEED_DEMO=true`. Documenter la commande dans `apps/api/README.md`... éviter un README non demandé. Documenter la commande dans [jeux-de-donnees.md](../jeux-de-donnees.md) en bas : `SEED_DEMO=true SEED_ACTIVATE_DEMO_COMMUNES=true`.
5. Mots interdits de publication dans une table `forbidden_terms` : versement préalable, acompte, frais de dossier, visa, travail en hauteur, chantier lourd, acte médical, mineur. La liste est un point de départ relu par la modération, pas une liste juridique close.

**Règles techniques et métier**

Réexécuter le seed ne duplique pas Kinshasa ni une catégorie. Activer une commune est un `UPDATE`, pas un redéploiement. Ne pas activer les 24 « pour que les formulaires marchent ».

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 06-A | Communes inactives par défaut | Seed sans le drapeau d’activation | `curl -s http://localhost/api/v1/catalog/communes?active=1` | Tableau vide | `SELECT count(*) FROM communes WHERE is_active` vaut 0. `count(*)` total vaut 24 |
| 06-B | Démo explicite | `SEED_ACTIVATE_DEMO_COMMUNES=true` | Relancer le seed de démo | Gombe, Ngaliema et Lemba seulement sont actives | Les 21 autres restent fausses |
| 06-C | Catégorie sensible | Seed | `SELECT name, is_sensitive FROM categories WHERE name IN ('Électricité','Garde d''enfants','Vente, promotion et distribution')` | Électricité et garde vraies, vente fausse | Ménage a `sensitive_if_home` vrai |
| 06-D | Interrupteur | Base fraîche | `SELECT services_payants FROM platform_settings` | `false` | Pas de ligne dans `commercial_prices` avec `active` |
| 06-E | Seed rejoué | Seed déjà passé | Relancer la même commande | Pas de doublon de ville | Contrainte unique sur le nom de commune |

**Tests automatisés nécessaires**

Test d’intégration du seed deux fois, et du filtre `active=1`.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `06-A` — Communes inactives par défaut
- [ ] `06-B` — Démo explicite
- [ ] `06-C` — Catégorie sensible
- [ ] `06-D` — Interrupteur
- [ ] `06-E` — Seed rejoué

**Livrables et règles**
- [ ] 24 communes, 0 active sans le drapeau de démo.
- [ ] 26 catégories conformes au tableau du CDC.
- [ ] `services_payants` faux.
- [ ] Tests automatisés exécutés avec succès : Jest : seed idempotent + filtre communes actives.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : une latitude inventée sans source, ou toutes les communes actives.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 06 : référentiels, réglages et seed. Ne construis pas l’authentification. Fournis la recette 06-A à 06-E.

