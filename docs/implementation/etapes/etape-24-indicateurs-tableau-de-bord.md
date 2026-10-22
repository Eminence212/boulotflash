<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 24 — Indicateurs |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-23-photos-justificatifs-exports.md](etape-23-photos-justificatifs-exports.md) |
| Suivante | [etape-25-confidentialite-export-fermeture.md](etape-25-confidentialite-export-fermeture.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 24 — Indicateurs et tableau de bord

**Objectif et résultat visible**

L’admin voit, sans export, les compteurs de la section 16.3 du CDC. Le CSV reste celui de l’étape 23.

**Exigences couvertes**

BF-AD-07, §16.

**Prérequis et dépendances**

Étapes 20, 21, 22 et 23. Les compteurs lisent la base, ils ne sont pas saisis à la main.

**Travaux à réaliser, dans l’ordre**

1. `GET /admin/metrics` pour support, modo, finance et super, en lecture.
2. Afficher : inscrits, offres validées, places acceptées, missions déclarées réalisées des deux côtés, signalements ouverts, paiements en vérification, notifications in-app non lues (optionnel).
3. Ne pas afficher un score de fiabilité ni un revenu candidat. **Pas de compteur FCM** (D36).
4. La contribution mensuelle n’est calculée que si `services_payants` a été vrai sur la période. Sinon afficher « recettes nulles, option désactivée » plutôt qu’un bénéfice.
5. Filtres de dates sur les compteurs, les mêmes bornes que l’export.

**Règles techniques et métier**

Les inscrits ne sont pas le signal principal : le libellé de l’écran le rappelle.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 24-A | Compteurs | Jeu de seed connu | `super` ouvre le tableau | Les nombres correspondent à des `count` SQL préparés dans la recette | Pas de colonne « note moyenne » ni « FCM » |
| 24-B | Signalements | Un signalement ouvert du seed | Recharger | Le compteur signalements ouverts ≥ 1 | Les candidatures restent |
| 24-C | Recettes nulles | Interrupteur faux | Lire le bloc économique | « recettes nulles » | Aucun bénéfice affiché |
| 24-D | Visiteur | Sans session admin | `GET /admin/metrics` | 401 |  |

**Tests automatisés nécessaires**

Jest du service de métriques sur un jeu SQL fixe.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `24-A` — Compteurs
- [ ] `24-B` — Signalements
- [ ] `24-C` — Recettes nulles
- [ ] `24-D` — Visiteur

**Livrables et règles**
- [ ] Les indicateurs du CDC §16.3 sont lisibles sans export.
- [ ] Pas de note publique dérivée.
- [ ] Tests automatisés exécutés avec succès : Jest service métriques sur jeu SQL fixe.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : un montant de salaire traité comme une recette BoulotFlash.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 24 : tableau de bord. Ne modifie pas les règles de sélection. Fournis la recette 24-A à 24-D et les requêtes SQL de contrôle.

