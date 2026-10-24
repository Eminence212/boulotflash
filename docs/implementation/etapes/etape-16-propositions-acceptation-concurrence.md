<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 16 — Propositions, réservation, acceptation, concurrence |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-15-candidature-anti-spam.md](etape-15-candidature-anti-spam.md) |
| Suivante | [etape-17-revelation-revocation-coordonnees.md](etape-17-revelation-revocation-coordonnees.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 16 — Propositions, réservation, acceptation, expiration et concurrence

**Objectif et résultat visible**

Le recruteur présélectionne sans réserver, ou propose une place qui réserve. Le candidat accepte ou décline. Deux propositions simultanées sur la dernière place : une seule réussit. Une proposition expirée ne s’accepte plus.

**Exigences couvertes**

BF-A-03, BF-SEL-01 à BF-SEL-04, BF-A-05. Recettes 6 et 7. §4.4, §9.3.

**Prérequis et dépendances**

Étape 15. D03 et D04. Horloge de test. Le contact complet est l’étape 17 : ici l’acceptation crée la participation et peut renvoyer le contact si l’étape 17 est déjà là. Si cette étape est livrée seule, la réponse d’acceptation contient `participationId` et **pas** encore l’adresse, pour ne pas devancer le contrôle de fuite. Le plan impose : ne pas renvoyer l’adresse dans cette étape. L’étape 17 branche le DTO de contact. L’acceptation crée bien la participation.

**Travaux à réaliser, dans l’ordre**

1. Écran recruteur des candidatures : nom d’usage, commune, compétences, disponibilité, badge téléphone. Pas le numéro.
2. Présélection et refus. Le refus notifie en in-app seulement (l’étape 18 écrira la notification ; ici poser l’appel au service s’il existe, sinon laisser un TODO isolé dans le service de notification vide qui enregistre déjà la ligne in-app minimale). Pour ne pas bloquer : écrire la notification in-app dans cette étape pour refus, proposition, acceptation, expiration. L’étape 18 généralisera. C’est acceptable car la matrice l’exige dès que l’événement existe.
3. `POST .../offer` sous transaction et `SELECT FOR UPDATE` sur `jobs`. Échéance = maintenant + `proposal_min_hours`, plafonnée à `selection_deadline`. Si le plafond est avant le minimum, 409 `PROPOSAL_TOO_SHORT` et aucune réservation.
4. Acceptation dans la même forme de transaction : la proposition `PENDING` devient `ACCEPTED`, la participation `CONFIRMED` est créée, l’application passe à `ACCEPTED`. Recompter les occupantes. Si la capacité est dépassée, annuler toute la transaction.
5. Déclin et expiration : proposition terminée, place libre, candidature `DECLINED` ou `EXPIRED`.
6. Worker BullMQ : job différé à `expires_at`. L’horloge de test déclenche aussi un balayage `POST /test/run-expirations` protégé par le hook.
7. Quand les participations non annulées égalent la capacité, `jobs.status = FILLED`.
8. Idempotence de l’acceptation.

**Règles techniques et métier**

`occupées = propositions PENDING non expirées + participations status <> CANCELLED`. La proposition devenue `ACCEPTED` n’est plus dans le premier terme. Ne pas décrémenter `workers_needed`.

Le recruteur ne voit pas les candidatures d’un autre (recette 9), déjà par le filtre `employer_id`.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 16-A | Présélection | `R-2`, candidature sur `J-PUB-1` | Cliquer Présélectionner | Statut « Présélectionnée ». Places restantes inchangées | Aucune ligne `selection_offers` |
| 16-B | Proposition | Même offre, 2 places | Proposer une place à `C-COMPLET` | Échéance visible. Places restantes diminuées de 1 | Offre `PENDING` |
| 16-C | Numéro caché | Écran des candidatures | Lire la carte candidat | Pas de `+243` | Le JSON du recruteur n’a pas `phone` |
| 16-D | Acceptation | Candidat de 16-B | Accepter avant l’échéance | Participation confirmée. Places : la réservation n’est pas comptée en plus | Une participation, une offre `ACCEPTED`. `occupées` stable entre avant et après l’acceptation |
| 16-E | Déclin | Autre proposition | Décliner | Place à nouveau proposable | Statut « Déclinée » |
| 16-F | Expiration | Proposition dont `expires_at` est proche | Avancer l’horloge de test après l’échéance. Cliquer Accepter | « Cette proposition a expiré. » | Place libre. Worker ou balayage a le statut `EXPIRED` |
| 16-G | Moins de 2 heures | Offre `J-PROCHE` | Proposer une place | `PROPOSAL_TOO_SHORT`, aucune réservation | Le registre dit que D04 n’est pas validé |
| 16-H | Concurrence des propositions | `J-PUB-UNIQUE`, 1 place, candidatures de `C-A` et `C-B`. Deux fenêtres du compte `R-2` | Cliquer « Proposer une place » sur les deux candidats aussi simultanément que possible. En parallèle, deux `curl` avec deux clés d’idempotence | Une seule 201. L’autre 409 « Il n'y a plus de place à réserver. » | `count` des offres `PENDING` vaut 1 |
| 16-I | Double acceptation | Une seule proposition | Double clic Accepter, deux requêtes dont une rejouée avec la même clé | Une participation | `count` participations vaut 1 |
| 16-J | Capacité par fixture illégale | Expliqué : le parcours normal ne crée pas deux `PENDING` sur une place. Le test automatisé insère le second `PENDING` en SQL | Deux acceptations parallèles | Une seule transaction gagne. L’autre 409 `SLOT_FULL` | Pas deux participations |
| 16-K | Autre recruteur | `R-1` | `GET` des candidatures de l’offre de `R-2` | 404 |  |
| 16-L | Pourvue | Accepter jusqu’à la capacité | Regarder la liste | Statut « Pourvue ». Plus de candidature |  |

**Tests automatisés nécessaires**

Jest avec transactions parallèles sur Postgres pour 16-H et 16-J. Test d’expiration. Test que l’acceptation ne double pas le décompte.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [x] `16-A` — Présélection
- [x] `16-B` — Proposition
- [x] `16-C` — Numéro caché
- [x] `16-D` — Acceptation
- [x] `16-E` — Déclin
- [x] `16-F` — Expiration
- [x] `16-G` — Moins de 2 heures
- [x] `16-H` — Concurrence des propositions
- [x] `16-I` — Double acceptation
- [x] `16-J` — Capacité par fixture illégale
- [x] `16-K` — Autre recruteur
- [x] `16-L` — Pourvue

**Livrables et règles**
- [x] Recettes 6, 7 et 9 (9 : partie étape 16 = 16-K ; 17-I relève de l’étape 17).
- [x] Invariant de réservation expliqué et prouvé.
- [x] Aucune adresse dans les réponses de cette étape.
- [x] Tests automatisés exécutés avec succès : Jest concurrence (16-H/J), expiration, acceptation.
- [x] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : deux participations au-delà de `workers_needed`, ou une présélection qui réserve.

**Compte rendu de recette — 24 octobre 2026**

Pile Docker locale (`docker compose --env-file .env.development`), API, worker et web reconstruits, migration `20261024100000_selection_offers_concurrency` appliquée.

*Comptes.* Les comptes démo nommés (`R-2`, `C-COMPLET`, `C-A`…) sont semés mais ne peuvent pas se connecter : OAuth réel uniquement, aucun jeton `demo:` (D34). La recette manuelle a donc été jouée dans le navigateur avec des comptes équivalents créés par `POST /auth/dev-session` (hook de test) et configurés comme les fixtures : recruteur « Boutique (R-2 recette) » abonnement `ACTIVE`, recruteur « Restaurant (R-1 recette) », candidats complets Grâce (C-COMPLET), Patrick (C-A), Sarah (C-B), plus Jonas, Merveille et Fiston pour les déclin, expiration et capacité. Offres : `J-PUB-1 (recette 16)` 2 places, `J-PUB-UNIQUE (recette 16)` 1 place, `J-PROCHE (recette 16)` clôture à 30 min. Les fixtures nommées de `jeux-de-donnees.md` sont aussi semées (`J-PUB-UNIQUE`, `J-PROCHE`, candidatures de C-A, C-B, C-COMPLET).

| ID | Attendu | Observé | Statut |
| --- | --- | --- | --- |
| 16-A | « Présélectionnée », places inchangées, aucune ligne `selection_offers` | Badge « Présélectionnée », « 2 places libres sur 2 », base : `SHORTLISTED`, 0 proposition | OK |
| 16-B | Échéance visible, places −1, `PENDING` | « Réponse attendue avant sam. 24 oct., 11:58 (dans 2 h) », « 1 place libre sur 2 », base `PENDING` 11:58 | OK |
| 16-C | Pas de `+243`, JSON recruteur sans `phone` | Page sans numéro ; JSON : 0 clé `phone`, 0 `+243`, 0 adresse ; candidat = `availability, commune, displayName, isAvailable, phoneBadge, skills` | OK |
| 16-D | Participation confirmée, réservation non comptée en plus | « Votre place est confirmée », « 1 place restante sur 2 » ; `occupied` = 1 avant et 1 après ; 1 participation, offre et candidature `ACCEPTED`, aucune adresse | OK |
| 16-E | Place à nouveau proposable, « Déclinée » | Badge « Déclinée » ; places 0 → 1 ; base `DECLINED/DECLINED` | OK |
| 16-F | « Cette proposition a expiré. », place libre, `EXPIRED` | Horloge de test avancée après l’échéance, clic Accepter : message affiché, place libérée ; offre et candidature `EXPIRED` (expirées par l’acceptation, avant tout worker) ; balayage ensuite sans doublon (1 notification de proposition, 2 d’expiration) | OK |
| 16-G | `PROPOSAL_TOO_SHORT`, aucune réservation ; D04 non validé | Message D04 affiché, places inchangées ; API 409 `PROPOSAL_TOO_SHORT` ; 0 proposition ; colonne de validation de D04 vide dans le registre | OK |
| 16-H | Une 201, une 409 « Il n'y a plus de place à réserver. », 1 `PENDING` | Deux onglets du recruteur, confirmations envoyées l’une après l’autre à quelques ms : une 201, une 409 avec le message exact ; puis deux `curl` réellement parallèles, deux clés, sur `J-PUB-UNIQUE-2` : 201 + 409 `SLOT_FULL` ; `count PENDING` = 1 dans les deux cas | OK |
| 16-I | Une participation | Double clic : une seule requête envoyée (garde de l’interface) ; puis deux `curl` parallèles même clé, un rejeu même clé, une autre clé : quatre 200, même `participationId` ; 1 participation | OK |
| 16-J | Une transaction gagne, l’autre 409 `SLOT_FULL`, pas deux participations | Fixture SQL ci-dessous, deux acceptations `curl` parallèles : 200 + 409 `SLOT_FULL` ; 1 participation ; offre `FILLED` | OK |
| 16-K | 404 | `R-1` : `GET /jobs/{id}/applications` → 404 `NOT_FOUND`, action → 404 ; écran « Offre introuvable. », aucun candidat | OK |
| 16-L | « Pourvue », plus de candidature | Badge « Pourvue » (Mes missions, détail), « 0 places restantes sur 2 », « Candidatures closes » ; base `FILLED`, `workers_needed` = 2, 2 participations ; candidature d’un tiers → 409 `OFFER_NOT_OPEN` | OK |

*Recettes.* 6 (acceptations simultanées) : 16-H, 16-I, 16-J OK. 7 (proposition expirée) : 16-F OK ; worker vérifié sur la pile : le job BullMQ programmé à la création d’une proposition (`expire-{id}`, état `delayed`) a été avancé, le worker l’a traité (`completed`, `expired: true`), offre et candidature `EXPIRED`, place libérée, 2 notifications d’expiration. 9 : partie 16-K OK ; 17-I relève de l’étape 17.

*Fixture SQL de 16-J (test uniquement).* Le parcours normal ne peut pas créer deux `PENDING` pour une place : la proposition refuse (`SLOT_FULL`) et l’index partiel `selection_offers_one_pending_per_application` bloque même la seconde sur une même candidature. Après une proposition légale à C-B, on insère, dans la base de test, une seconde proposition `PENDING` pour C-D en copiant `job_version_id` et `expires_at`, puis on passe sa candidature à `OFFERED`. Ce script n’existe que dans la recette et dans `selection.int.test.ts` ; il ne doit jamais être joué hors environnement de test.

*Invariant et recomptage.* `occupées = propositions PENDING non expirées + participations status <> CANCELLED` (D03), calculé sous `SELECT … FOR UPDATE` sur la ligne `jobs` pour proposer. À l’acceptation, le recomptage porte sur les participations non annulées. Point à valider : appliqué à la lettre sur la fixture illégale de 16-J, l’invariant complet ferait échouer les **deux** acceptations (la participation de A plus la réservation encore `PENDING` de B dépassent la capacité), alors que ce document et BF-SEL-03 attendent une réussite et un `SLOT_FULL`. Dans tout état atteignable par le parcours, les deux contrôles donnent le même résultat, puisque l’acceptation convertit une réservation en participation sans changer le total. D03 n’est pas modifié.

*Anomalies corrigées pendant la recette.* Boutons et badges tronqués sur mobile (« Proposei », « Accepter la pla », « Pou… ») : actions empilées, `StatusBadge` ne rétrécit plus. Messages en double après déclin, expiration et acceptation : supprimés.

*Tests automatisés.* `apps/api/src/modules/selection/__tests__/selection.int.test.ts` : 15 tests sur l’API et Postgres réels (16-A à 16-L, balayage parallèle et rejoué, worker BullMQ réel, même clé en parallèle, refus in-app). Suite API complète : 14 suites, 98 tests OK (`jest --runInBand`). Contrôle de mutation : sans le verrou `FOR UPDATE`, 16-H, 16-I et 16-J échouent ; sans le recomptage de l’acceptation, 16-J échoue.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 16 : sélection, verrou de capacité, expiration. Ne mets pas les coordonnées dans les réponses. Fournis la recette 16-A à 16-L, en expliquant le fixture SQL de 16-J.

