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
- [ ] `16-A` — Présélection
- [ ] `16-B` — Proposition
- [ ] `16-C` — Numéro caché
- [ ] `16-D` — Acceptation
- [ ] `16-E` — Déclin
- [ ] `16-F` — Expiration
- [ ] `16-G` — Moins de 2 heures
- [ ] `16-H` — Concurrence des propositions
- [ ] `16-I` — Double acceptation
- [ ] `16-J` — Capacité par fixture illégale
- [ ] `16-K` — Autre recruteur
- [ ] `16-L` — Pourvue

**Livrables et règles**
- [ ] Recettes 6, 7 et 9.
- [ ] Invariant de réservation expliqué et prouvé.
- [ ] Aucune adresse dans les réponses de cette étape.
- [ ] Tests automatisés exécutés avec succès : Jest concurrence (16-H/J), expiration, acceptation.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : deux participations au-delà de `workers_needed`, ou une présélection qui réserve.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 16 : sélection, verrou de capacité, expiration. Ne mets pas les coordonnées dans les réponses. Fournis la recette 16-A à 16-L, en expliquant le fixture SQL de 16-J.

