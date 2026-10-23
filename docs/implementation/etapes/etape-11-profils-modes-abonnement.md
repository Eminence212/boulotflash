<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 11 — Profils, modes, abonnement initial |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-10-admin-totp-droits-internes.md](etape-10-admin-totp-droits-internes.md) |
| Suivante | [etape-12-offres-validation-moderation-versions.md](etape-12-offres-validation-moderation-versions.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 11 — Profils, modes et abonnement initial

**Objectif et résultat visible**

Un candidat complète son profil. Un recruteur ouvre son profil et voit un abonnement actif et gratuit, libellé « Services gratuits ». Le même compte peut passer d’un mode à l’autre. Un abonnement expiré ou un compte suspendu ne publie pas.

**Exigences couvertes**

BF-W-01, BF-W-02, BF-W-05, BF-E-01, BF-E-02, BF-E-04, BF-AD-10. Principes 4 et 8. Recette 14 pour le blocage d’abonnement.

**Prérequis et dépendances**

Étapes 06, 08, 09. Communes de démo actives seulement dans l’environnement de test.

**Travaux à réaliser, dans l’ordre**

1. Écrans profil candidat et recruteur selon les maquettes 5 et 7.
2. `PUT /me/worker-profile` et disponibilités en lignes `worker_availability`.
3. `POST /me/employer-profile` crée `employer_profiles` et `subscriptions` `ACTIVE` dans une transaction. `ends_at` null. Deuxième appel : 200 sans second abonnement.
4. Sélecteur de mode dans l’en-tête, visible seulement si les deux profils existent.
5. Le profil incomplet liste les manques et laisse la liste des offres ouverte. Après OAuth, « Compléter mon profil » couvre nom / téléphone / photo absents du provider (`PATCH /me`, BF-AUTH-12).
6. Aucune pièce d’identité. Photo facultative (upload à l’étape 23 si besoin).
7. Badge téléphone si `phone` est renseigné (`phone_confirmed_at` si provider ou validation support). Pas d’autre badge.

**Règles techniques et métier**

Sans abonnement `ACTIVE`, `POST /jobs` répond `SUBSCRIPTION_INACTIVE` même si les services sont gratuits. Le candidat n’a pas de route de paiement.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 11-A | Profil candidat | `C-INCOMPLET` | Connexion OAuth. Laisser la commune vide. Ouvrir l’accueil | Les manques sont listés. La liste des offres s’ouvre | `POST /jobs/{J-PUB-1}/applications` répond `PROFILE_INCOMPLETE` |
| 11-B | Profil complet | `C-COMPLET` ou nouveau numéro | Renseigner nom, Lemba, vente, lundi matin. Enregistrer | Profil enregistré, disponibilité active | Lignes dans `worker_availability` |
| 11-C | Désactiver la disponibilité | Profil 11-B | Couper « Je suis disponible » | Le compte reste ouvert | `is_available` faux. La consultation des offres reste possible |
| 11-D | Abonnement à la création | Nouveau compte via Google réel (testeur) ; téléphone provider ou saisi au profil `+243820000010` | Créer le profil recruteur particulier, Gombe, nom du responsable | Écran « Services gratuits », abonnement actif | Une seule ligne `subscriptions`. `ends_at` null. Pas de paiement |
| 11-E | Deux modes | `R-DUAL` | Basculer candidat puis recruteur | Les boutons changent. Le mode candidat n’a pas « Publier » |  |
| 11-F | Abonnement expiré | `R-ABO-EXPIRE` | Ouvrir « Publier » | Message « Votre abonnement n’est pas actif. » | `POST /jobs` répond `SUBSCRIPTION_INACTIVE` |
| 11-G | Compte suspendu | `R-SUSPENDU` | Se connecter | Historique visible si le seed en a. Publier absent | 403 sur `POST /jobs` |
| 11-H | Double clic création recruteur | Session neuve | Envoyer deux fois `POST /me/employer-profile` | Un seul profil, un seul abonnement | Contrainte unique |

**Tests automatisés nécessaires**

Jest : transaction profil + abonnement, idempotence, refus si abonnement `EXPIRED` ou `SUSPENDED`.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [x] `11-A` — Profil candidat
- [x] `11-B` — Profil complet
- [x] `11-C` — Désactiver la disponibilité
- [x] `11-D` — Abonnement à la création
- [x] `11-E` — Deux modes
- [x] `11-F` — Abonnement expiré
- [x] `11-G` — Compte suspendu
- [x] `11-H` — Double clic création recruteur

**Livrables et règles**
- [x] Abonnement créé actif et gratuit.
- [x] Candidat jamais envoyé vers un paiement.
- [x] Modes distincts sur un même compte.
- [x] Tests automatisés exécutés avec succès : Jest : transaction profil+abonnement, idempotence, refus abo inactif.
- [x] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : publication possible avec abonnement expiré, ou second abonnement.

---

## Compte rendu de recette (22 oct. 2026)

| ID | OK/KO | Preuve |
| --- | --- | --- |
| 11-A | OK | `C-INCOMPLET` : `gaps=["Commune","Compétence principale","Disponibilités"]` ; `GET /jobs` 200 ; `POST /jobs/{J-PUB-1}/applications` → 403 `PROFILE_INCOMPLETE` |
| 11-B | OK | `C-COMPLET` : `gaps=[]` ; 1 ligne `worker_availability` (weekday=1, `MORNING`) |
| 11-C | OK | `PUT /me/worker-profile/availability` `{isAvailable:false}` ; compte reste `ACTIVE` ; `GET /jobs` 200 |
| 11-D | OK | Session neuve + `POST /me/employer-profile` → `created:true`, `subscription.status=ACTIVE`, `endsAt=null`, label « Services gratuits » ; 1 ligne `subscriptions` |
| 11-E | OK | `R-DUAL` : `canSwitch=true` ; `POST /me/mode` WORKER puis EMPLOYER ; UI `ModeSwitcher` + pas de « Publier » en mode candidat |
| 11-F | OK | `R-ABO-EXPIRE` : `POST /jobs` → 403 `SUBSCRIPTION_INACTIVE` (« Votre abonnement n’est pas actif. ») ; message sur `/publier` |
| 11-G | OK | `R-SUSPENDU` : statut `SUSPENDED` ; `POST /jobs` → 403 `FORBIDDEN` |
| 11-H | OK | Double `POST /me/employer-profile` → `created:true` puis `created:false` ; 1 seule `subscriptions` |

Jest : `profiles-subscription.int.test.ts` — **7/7 OK** (transaction, idempotence, availability, EXPIRED, SUSPENDED, PROFILE_INCOMPLETE).  
Anomalie bloquante : **absente**. Formulaire d’offre complet : non livré (refus d’accès seulement sur `/publier`).

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 11 : profils, modes et abonnement. Ne crée pas encore le formulaire d’offre complet au-delà du refus d’accès. Fournis la recette 11-A à 11-H.

