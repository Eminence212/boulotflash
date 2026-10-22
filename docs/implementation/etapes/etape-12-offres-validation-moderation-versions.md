<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 12 — Offres, validation, modération, versions |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-11-profils-modes-abonnement.md](etape-11-profils-modes-abonnement.md) |
| Suivante | [etape-13-recherche-detail-public-partage.md](etape-13-recherche-detail-public-partage.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 12 — Offres, validation, modération et versions

**Objectif et résultat visible**

Un recruteur déjà validé publie une offre non sensible sans paiement. Un nouveau recruteur et une catégorie sensible passent en file de modération. Une modification de montant crée une nouvelle version et ne change pas une acceptation déjà figée.

**Exigences couvertes**

BF-J-01 à BF-J-08, BF-AD-02, BF-E-02. Recettes 2, 3, 4, 10, 12 pour le gratuit, 14.

**Prérequis et dépendances**

Étapes 10 et 11. D05, D06, D14, D26 en recommandation de travail. `services_payants` reste faux : la soumission consomme un droit `FREE` `POST`.

**Travaux à réaliser, dans l’ordre**

1. Formulaire guidé, maquette 8. Enregistrer le brouillon à chaque étape côté serveur. L’écran ne dit « publiée » qu’après le JSON `PUBLISHED`.
2. Validations serveur : début dans le futur et sous 30 jours, durée 1 heure à 14 jours, places 1 à 20, montant strictement positif, devise CDF ou USD, base heure, journée ou mission, texte « à discuter » refusé, date limite de candidature avant clôture des sélections, clôture avant ou égale au début, catégorie active, mots interdits, deux contenus identiques du même recruteur dans la même heure refusés.
3. `at_private_home` force la revue pour ménage et lessive.
4. Premier recruteur : `IN_REVIEW`. Recruteur qui a déjà une validation positive et catégorie non sensible : `PUBLISHED` et droit `FREE` passé à `USED`.
5. Écran modo : approuver ou rejeter avec motif. Le recruteur voit le motif.
6. Rejet → le recruteur corrige → nouveau `IN_REVIEW`.
7. Modification substantielle : nouvelle `job_versions`, annulation des propositions `PENDING`, statut `IN_REVIEW`, participations `CONFIRMED` inchangées sur l’ancienne version.
8. Republier : nouvel id, champs copiés, aucune candidature copiée.
9. Partiellement pourvu : si `apply_deadline` est passé et qu’au moins une participation non annulée existe sans atteindre la capacité, rester `PUBLISHED` avec `applicationsOpen: false`. `EXPIRED` seulement sans aucune participation non annulée.
10. Liste « Mes missions » avec statut, nombre de candidatures, places acceptées, état d’abonnement. Partager sera branché à l’étape 13 ; le bouton peut être masqué tant que le lien public n’existe pas.

**Règles techniques et métier**

Une offre `IN_REVIEW`, `REJECTED`, `SUSPENDED`, `CANCELLED`, `EXPIRED` ou `FILLED` refuse `POST /applications` avec `OFFER_NOT_OPEN`. Le droit `FREE` est créé et consommé dans la même transaction que le passage en file ou en publication. Sans abonnement actif, pas de droit.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 12-A | Champs refusés | `R-2` | Créer une offre, montant vide, titre « À discuter », enregistrer | « Indiquez le montant pour publier. » Statut reste brouillon | Aucune ligne `PUBLISHED` |
| 12-B | Nouveau recruteur | `R-1`, aucune validation passée | Remplir une offre de vente complète à Gombe, soumettre | Statut « En modération ». Absente de `GET /jobs` public | `IN_REVIEW` en base |
| 12-C | Validation | `modo` | Ouvrir la file, approuver 12-B | L’offre devient publiée | `published_at` rempli. Droit `FREE` `USED` |
| 12-D | Rejet et motif | Soumettre une autre offre de `R-1` | `modo` rejette « Tâche trop vague » | Le recruteur voit ce motif. Il peut corriger | Nouvelle soumission revient `IN_REVIEW` |
| 12-E | Sensible | `R-2` qui a déjà publié | Soumettre une offre électricité | Reste en modération malgré l’historique | Catégorie vente de `R-2` peut, elle, passer directe |
| 12-F | Ménage à domicile | `R-2` | Ménage avec « au domicile » coché | File de revue | Le même ménage avec domicile non coché suit la règle non sensible |
| 12-G | Mineur et hauteur | `R-2` | Description « travail en hauteur pour un mineur » | Refus à la soumission | Pas de contournement par une catégorie vente |
| 12-H | Modification après acceptation | `J-POURVUE` | `R-2` change le montant | Les conditions de la participation restent l’ancien montant. L’offre repart en revue | `participations.job_version_id` inchangé. Nouvelle version n+1 |
| 12-I | Coupure | Formulaire ouvert, hors ligne | Cliquer Publier | « Non envoyé ». Au retour réseau, un seul brouillon ou une seule soumission | Pas de doublon dans la même heure |
| 12-J | Abonnement | `R-ABO-EXPIRE` | Tenter la soumission par l’API | `SUBSCRIPTION_INACTIVE` |  |
| 12-K | Clôture partielle | Offre 2 places, une participation confirmée, horloge après `apply_deadline` | `GET /jobs/{id}` | `applicationsOpen` faux, statut pas `EXPIRED` | Une nouvelle candidature répond `OFFER_NOT_OPEN` |
| 12-L | Republier | Offre publiée | Bouton Republier | Nouveau brouillon, anciennes candidatures absentes | Nouvel UUID |

**Tests automatisés nécessaires**

Jest des transitions : brouillon, revue, rejet, republication, version figée, expiration seulement sans acceptation, mots interdits.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `12-A` — Champs refusés
- [ ] `12-B` — Nouveau recruteur
- [ ] `12-C` — Validation
- [ ] `12-D` — Rejet et motif
- [ ] `12-E` — Sensible
- [ ] `12-F` — Ménage à domicile
- [ ] `12-G` — Mineur et hauteur
- [ ] `12-H` — Modification après acceptation
- [ ] `12-I` — Coupure
- [ ] `12-J` — Abonnement
- [ ] `12-K` — Clôture partielle
- [ ] `12-L` — Republier

**Livrables et règles**
- [ ] Recettes 2, 3 et 4 tenues sur le parcours gratuit.
- [ ] Version acceptée immuable.
- [ ] Pas de paiement demandé.
- [ ] Tests automatisés exécutés avec succès : Jest transitions offre / version / expiration partielle.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : une offre en modération visible dans la liste publique, ou un montant accepté qui change.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 12 : offres, modération et versions. Le partage natif et la carte attendent les étapes 13 et 14. Fournis la recette 12-A à 12-L.

