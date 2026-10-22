<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 22 — Services gratuits, paiement, droits uniques |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-21-signalements-recours-files-admin.md](etape-21-signalements-recours-files-admin.md) |
| Suivante | [etape-23-photos-justificatifs-exports.md](etape-23-photos-justificatifs-exports.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 22 — Services gratuits, activation du paiement et droits uniques

**Objectif et résultat visible**

Tant que l’interrupteur est faux, publier et mettre en avant ne demande pas d’argent. Quand le super-admin l’active, un paiement en attente ou une capture seule ne livre rien. Une confirmation livre un seul droit. Une seconde confirmation ne livre pas un second service.

**Exigences couvertes**

BF-J-03, BF-J-05, BF-AD-05, BF-AD-06, BF-AD-10, BF-AD-11, §10. Recettes 12, 13 et 14.

**Prérequis et dépendances**

Étapes 10 et 12. D01, D14, D22, D23. Aucun prix actif tant que le super-admin n’en saisit pas. En test, il saisit 3 USD et 10 USD / 24 h, marqués valeurs de test.

**Travaux à réaliser, dans l’ordre**

1. Écran recruteur : « Services gratuits » ou « Services payants », plus l’état d’abonnement.
2. Interrupteur réservé au super-admin, journal `SERVICES_PAYANTS_ON` ou `OFF`.
3. Quand l’interrupteur est faux : `submit` et mise en avant consomment un droit `FREE`. Pas d’écran de paiement. Pas de reçu.
4. Quand il est vrai : sans droit `AVAILABLE`, la soumission reste `DRAFT` et répond `PAYMENT_REQUIRED`. Elle n’entre pas dans la file de modération. Le registre rappelle que le CDC pouvait se lire autrement (D14).
5. Le recruteur crée un paiement `PENDING`, choisit un opérateur activé, peut joindre une capture via URL pré-signée. Le statut passe à `UNDER_REVIEW`. La capture ne confirme pas.
6. Finance saisit référence, montant et « réception effective » cochée. Alors seulement `CONFIRMED`, un droit `PAID`, un reçu in-app, et un e-mail si `users.email` est présent. Sinon pas d’e-mail ; l’in-app part selon la matrice (pas de FCM).
7. Contrainte unique : seconde confirmation → `RIGHT_ALREADY_ISSUED`. Même clé d’idempotence → même 200.
8. Couper l’interrupteur : les prochains usages redeviennent gratuits. Le droit déjà `USED` reste.
9. Remboursement : droit `REVOKED`, l’offre déjà publiée n’est pas dépubliée automatiquement. Le finance la suspend s’il le faut. Ne pas inventer une dépublication silencieuse.
10. Mise en avant retirée de la tête de liste dès que l’offre n’est plus `PUBLISHED` ou que `featured_until` est passé.
11. Un recruteur suspendu ne paie pas une mise en avant pour revenir. Le paiement peut être créé mais la consommation est refusée tant que le compte ou l’abonnement n’est pas actif.

**Règles techniques et métier**

Le candidat n’a aucune de ces routes. Un service gratuit ne crée pas de ligne `payments`.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 22-A | Gratuit | `services_payants` faux, `R-2`, abonnement actif | Publier une offre non sensible et demander une mise en avant | Les deux aboutissent. Aucun paiement | Droits `FREE` `USED`. Libellé « Services gratuits » |
| 22-B | Activation | `super` | Activer l’interrupteur. Saisir les prix de test | Journal écrit. L’écran recruteur passe à « Services payants » |  |
| 22-C | Pas de livraison | Interrupteur vrai | `R-2` soumet une offre sans payer | Reste brouillon. Message qui demande le paiement | Absente de la file modo |
| 22-D | Capture seule | Créer le paiement, envoyer une image | `finance` ouvre le dossier sans cocher la réception | Statut « en vérification ». Pas de droit |  |
| 22-E | Confirmation | `finance` | Saisir la référence `TEST-REF-1`, le montant 3 USD, cocher la réception, confirmer | Un droit `POST` `AVAILABLE`. Reçu in-app | Une ligne `publication_rights` |
| 22-F | Double confirmation | Rejouer le bouton, puis un second appel sans la même clé |  | Pas de second droit. 409 `RIGHT_ALREADY_ISSUED` ou rejeu idempotent | `count` des droits de ce `payment_id` vaut 1 |
| 22-G | E-mail | Compte avec e-mail, adaptateur e-mail simulé | Confirmer | Ligne `EMAIL`. Sans e-mail sur un autre compte : pas de ligne EMAIL, l’in-app existe | Le corps du reçu n’a pas d’adresse de mission |
| 22-H | Abonnement suspendu | `R-ABO-EXPIRE` | Tenter d’acheter et de publier | Refus |  |
| 22-I | Coupure de l’option | `super` désactive | `R-2` publie une nouvelle offre | Gratuite. Le droit payé déjà utilisé n’est pas repris |  |
| 22-J | Mise en avant | Offre publiée, droit `FEATURED` consommé, puis offre suspendue |  | Elle n’est plus en tête de liste | `featured_until` ignoré hors `PUBLISHED` |
| 22-K | Candidat | `C-COMPLET` | Chercher un écran de paiement | Aucun | `POST /billing/payments` répond 403 |

**Tests automatisés nécessaires**

Jest : gratuit sans paiement, capture qui ne confirme pas, unicité du droit, idempotence, refus si abonnement inactif, candidat interdit.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `22-A` — Gratuit
- [ ] `22-B` — Activation
- [ ] `22-C` — Pas de livraison
- [ ] `22-D` — Capture seule
- [ ] `22-E` — Confirmation
- [ ] `22-F` — Double confirmation
- [ ] `22-G` — E-mail
- [ ] `22-H` — Abonnement suspendu
- [ ] `22-I` — Coupure de l’option
- [ ] `22-J` — Mise en avant
- [ ] `22-K` — Candidat

**Livrables et règles**
- [ ] Recettes 12, 13 et 14.
- [ ] Un paiement, un droit, prouvé en base.
- [ ] D14 écrit comme non validé.
- [ ] Tests automatisés exécutés avec succès : Jest FREE / capture / unicité droit / idempotence.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : second droit, ou service livré sur une capture seule.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 22 : interrupteur, paiement manuel et droits. N’ajoute pas d’encaissement automatique. Fournis la recette 22-A à 22-K.

