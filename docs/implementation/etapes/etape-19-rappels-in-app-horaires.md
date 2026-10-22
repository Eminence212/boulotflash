<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 19 — Rappels in-app et horloge Kinshasa |
| Normatif produit | [CDC.md](../../CDC.md) §8 (in-app seul) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-18-notifications-in-app-correspondance.md](etape-18-notifications-in-app-correspondance.md) |
| Suivante | [etape-20-realisation-annulation-salaire-retours.md](etape-20-realisation-annulation-salaire-retours.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 19 — Rappels in-app et horloge Kinshasa

**Objectif et résultat visible**

Le worker crée le **rappel in-app** avant le début d’une mission (hypothèse D16). Toute la matrice §8 reste **in-app uniquement**. Aucun adaptateur FCM, aucun `device_tokens`, aucun projet Firebase Messaging.

**Exigences couvertes**

CDC §8.1–§8.3 (canal in-app), BF-M-05, D16. D36 : push hors pilote.

**Prérequis et dépendances**

Étape 18 (centre in-app et correspondance). Horloge testable (`ENABLE_TEST_HOOKS`).

**Travaux à réaliser, dans l’ordre**

1. Confirmer qu’aucune route ni worker n’appelle Firebase / FCM. Refuser toute variable `FCM_*` ou `FIREBASE_*` de messaging au démarrage (ou les ignorer avec log d’avertissement documenté — préférence : **absence totale**).
2. Job worker `mission-reminder` : pour chaque participation `CONFIRMED` dont `start_at − REMINDER_HOURS_BEFORE` est atteint, écrire une ligne `notifications` `IN_APP` (une fois). Pas d’e-mail, pas de push.
3. Quiet hours : **sans objet** pour le push (inexistant). Les in-app restent immédiats 24 h/24.
4. Matrice §8.2 : vérifier que chaque événement métier de l’étape 18/20 produit bien une ligne `IN_APP` et **zéro** ligne `FCM`.
5. Healthcheck : ne dépend d’aucun service de push.
6. Documenter dans le registre : D36 non validé terrain (réintroduction push ultérieure).

**Règles techniques et métier**

Le centre in-app est la seule source de vérité notification. L’API métier ne dépend d’aucun prestataire de push.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 19-A | Rappel in-app | Participation confirmée, début dans 3 h | Lancer le balayage reminder | Une notification in-app de rappel | Pas de seconde ligne au rejeu |
| 19-B | Pas de FCM | Base après proposition / acceptation / candidature | `SELECT count(*) FROM notifications WHERE channel = 'FCM'` | 0 | Idem pour `device_tokens` vides ou table absente |
| 19-C | Correspondance | Publier offre correspondante | Lire le centre | In-app seulement | 0 FCM, 0 EMAIL pour `JOB_MATCH` |
| 19-D | Nuit | Horloge 22:00 Kinshasa | Créer une candidature | In-app immédiat | Pas de file push |
| 19-E | Refus | Refuser une candidature | Centre candidat | In-app, conforme matrice |  |
| 19-F | Santé | Couper toute clé « Firebase » éventuelle | `/api/v1/health` | 200 | Postuler / publier OK |
| 19-G | Pas de permission navigateur | Navigateur sans notif système | Parcourir le parcours nominal | Tout fonctionne via le centre in-app | Aucune invite push obligatoire |
| 19-H | Contenu | Ouvrir une notif proposition | Lire titre / corps | Pas de téléphone ni adresse exacte | Lien vers l’écran métier |

**Tests automatisés nécessaires**

Jest : reminder idempotent ; assert qu’aucun publisher FCM n’existe dans le graphe de modules ; filtre `channel` réservé à `IN_APP` (et `EMAIL` à l’étape 22 seulement).

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `19-A` — Rappel in-app
- [ ] `19-B` — Pas de FCM
- [ ] `19-C` — Correspondance
- [ ] `19-D` — Nuit
- [ ] `19-E` — Refus
- [ ] `19-F` — Santé
- [ ] `19-G` — Pas de permission navigateur
- [ ] `19-H` — Contenu

**Livrables et règles**
- [ ] Matrice §8 entièrement in-app (aucun push).
- [ ] Rappel mission in-app (D16) prouvé.
- [ ] Aucune dépendance Firebase Messaging dans le Compose / `.env`.
- [ ] Tests automatisés exécutés avec succès : reminder + absence de publisher FCM.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : une ligne `notifications.channel = FCM`, un appel Firebase, ou une candidature bloquée faute de push.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 19 : rappels in-app et garantie d’absence de push. Ne branchez pas FCM. Fournis la recette 19-A à 19-H.
