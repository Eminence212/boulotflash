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
- [x] `19-A` — Rappel in-app
- [x] `19-B` — Pas de FCM
- [x] `19-C` — Correspondance
- [x] `19-D` — Nuit
- [x] `19-E` — Refus
- [x] `19-F` — Santé
- [x] `19-G` — Pas de permission navigateur
- [x] `19-H` — Contenu

**Livrables et règles**
- [x] Matrice §8 entièrement in-app (aucun push).
- [x] Rappel mission in-app (D16) prouvé.
- [x] Aucune dépendance Firebase Messaging dans le Compose / `.env`.
- [x] Tests automatisés exécutés avec succès : reminder + absence de publisher FCM.
- [x] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : une ligne `notifications.channel = FCM`, un appel Firebase, ou une candidature bloquée faute de push.

**Compte rendu de recette — 24 octobre 2026**

Pile Docker locale, API, worker et web reconstruits. Aucune migration.

*Réalisation.*
- Le worker `mission-reminders` est déclenché chaque minute par un planificateur BullMQ (`upsertJobScheduler`, idempotent au redémarrage).
- Il lit `platform_settings.reminder_hours_before` (3 par défaut, D16).
- Pour chaque participation `CONFIRMED`, non révoquée, dont le début tombe dans `]maintenant, maintenant + 3 h]`, il écrit une ligne `IN_APP` à chacune des deux parties, avec `dedupe_key = mission_reminder:{participationId}`.
- Pas d’heures calmes, pas de file de nuit. Un rappel manqué pendant un arrêt du worker part au retour, si la mission n’a pas commencé.
- Hook de test `POST /test/run-reminders`, à l’heure applicative.
- Délai réglable par l’administration, à la demande du porteur du projet. Le délai est lu dans `platform_settings.reminder_hours_before` à chaque balayage, jamais dans une variable d’environnement `REMINDER_HOURS_BEFORE`. Un super-admin le change avec `GET` et `PATCH /admin/settings/reminder-hours` (entier de 1 à 24, journal `SETTINGS_REMINDER_HOURS` avec l’ancienne et la nouvelle valeur), ou depuis la carte « Réglages · rappel de mission » en tête de l’écran d’administration. Seul le scope `SUPER` est accepté : `modo` a été vérifié (403), `support` et `finance` ne l’ont pas été.
- Le reste existait déjà depuis l’étape 04 et a été vérifié : la garde de démarrage refuse `FCM_*` et les clés Firebase Messaging, la table `device_tokens` est absente, et l’enum `NotificationChannel` se limite à `IN_APP` et `EMAIL`.
- Le registre reçoit une note de suivi : D36 n’est pas validé terrain, et D16 est appliqué comme hypothèse. La case « Tranché le » reste vide.

*Comptes.* Équivalents aux fixtures, créés par `POST /auth/dev-session` (D34) : Boutique (R-2), Grâce (C-COMPLET) et Sarah (C-B), à Gombe, vente, disponibles tous les soirs. Une participation Grâce–R-2 a été confirmée par le parcours réel (proposition puis acceptation par l’API) sur une offre qui commence 2 h 55 plus tard.

| ID | Attendu | Observé | Statut |
| --- | --- | --- | --- |
| 19-A | Une notification in-app de rappel ; pas de seconde ligne au rejeu | Sans hook, le worker a écrit en moins d’une minute deux lignes `IN_APP` : « Rappel de mission », « « Inventaire du soir (recette 19-A) », sam. 24 oct., 18 h 10, Gombe, commence dans 2 h 54. Ouvrez les coordonnées… ». Grâce le voit en tête de son centre ; la notification ouvre `/participations/{id}`. Balayage relancé à la main (`/test/run-reminders`) : `scanned 1, created 0`, toujours 2 lignes | OK |
| 19-B | 0 ligne `FCM` ; `device_tokens` vide ou absente | `SELECT … WHERE channel = 'FCM'` est rejeté par Postgres : la valeur n’existe pas dans l’enum. Comparé en texte (`channel::text = 'FCM'`) : 0. `to_regclass('device_tokens')` : table absente. Canaux en base : `IN_APP` seulement (voir les anomalies pour `EMAIL`) | OK |
| 19-C | In-app seulement ; 0 FCM, 0 EMAIL pour `JOB_MATCH` | Un recruteur neuf (parcours `POST /me/employer-profile`) publie « Vente du soir (recette 19-C) », approuvée par `modo`. Le centre de Grâce (lu par l’API) contient l’alerte. 2 lignes `job_match`, toutes `IN_APP`. Sur toute la base : 1 276 lignes `job_match`, toutes `IN_APP` | OK |
| 19-D | In-app immédiat à 22 h ; pas de file push | Horloge applicative posée à 22:00 Kinshasa, Sarah postule dans l’interface : la ligne `application_submitted` du recruteur est créée 3 ms après la candidature, `IN_APP`, `SENT`. Files BullMQ présentes : `selection-offers`, `match-profiles`, `mission-reminders`, aucune file push | OK |
| 19-E | Refus in-app, conforme à la matrice | R-2 refuse Sarah dans l’interface ; le centre de Sarah affiche « Candidature non retenue » | OK |
| 19-F | `/health` 200 sans clé Firebase ; postuler et publier OK | `/api/v1/health` → 200 (`postgres`, `redis`, `s3` ok, aucun service de push contrôlé). Aucune variable FCM ou Firebase dans les conteneurs API et worker. Démarrage simulé avec `FIREBASE_SERVER_KEY` : refusé (`FCM_FORBIDDEN`, sortie 1, valeur non affichée). Candidature (19-D) et publication (19-C) passent | OK |
| 19-G | Tout fonctionne via le centre ; aucune invite push | Dans le navigateur intégré, `Notification.permission` vaut `denied`, aucun service worker, aucun manifeste. Le parcours candidature → refus → centre, et l’ouverture des notifications, ont fonctionné sans aucune invite | OK |
| 19-H | Ni téléphone ni adresse exacte ; lien vers l’écran métier | « Une place vous est proposée » : « Pour « Inventaire du soir (recette 19-A) », sam. 24 oct., 18 h 10, Gombe, 15 USD la mission. Acceptez ou déclinez avant sam. 24 oct., 17 h 15 ; l’adresse exacte s’affiche après acceptation. » Aucun numéro, aucune adresse. Elle ouvre `/missions/{id}` | OK |

*Réglage du délai par l’administration.* Écran d’administration en vue mobile, session `super` : la carte affiche 3. Passée à 4 puis enregistrée, elle confirme « Rappel envoyé 4 h avant le début des missions. ». Base : `reminder_hours_before = 4`, `updated_by` rempli, audit `{"previous": 3, "next": 4}`. Le balayage suivant répond `hoursBefore: 4`. Remise à 3 depuis le même écran.

*Anomalies relevées pendant la recette.*
- Mon test « le centre ne lit que le canal IN_APP » insérait une ligne `EMAIL` de test, `payment_receipt`, sans la supprimer : 4 lignes après 4 exécutions. Le test la supprime désormais, et les 4 lignes, toutes rattachées à des comptes `etape19-*`, ont été effacées. Il ne reste aucune ligne `EMAIL` en base.
- La requête de 19-B telle qu’écrite dans la fiche ne s’exécute pas sur ce schéma (valeur d’enum inconnue). Ce n’est pas un défaut du code, mais la recette doit utiliser `channel::text = 'FCM'`.

*Points à valider.*
- Les bornes du réglage, de 1 à 24 h, sont un choix d’implémentation : ni le CDC ni le plan n’en fixent.
- Une participation confirmée moins de 3 h avant le début reçoit son rappel au balayage suivant, donc tout de suite.

*Tests automatisés.*
- `apps/api/src/modules/notifications/__tests__/reminders.int.test.ts` (4 tests, API et Postgres réels, horloge de test) : rien une minute avant la fenêtre ; deux lignes `IN_APP` dans la fenêtre ; une ligne par personne après rejeu et nouveau passage ; ni numéro ni adresse ; lien vers les coordonnées ; aucun rappel après annulation ou une fois la mission commencée ; 19-D ; le centre ignore une ligne `EMAIL`.
- `no-push.test.ts` (5 tests) vérifie :
  - aucune dépendance de push dans les `package.json` de l’API, du worker, du web et des paquets ;
  - aucun import Firebase ou Web Push, aucun `Notification.requestPermission` ni abonnement push dans les sources ;
  - schéma sans canal `FCM` ni `device_tokens` ;
  - ni le Compose ni les `.env` ne déclarent de clé FCM ou Firebase.

  Contrôle par mutation : un import `firebase/messaging` ajouté, puis une clé `FCM_SERVER_KEY` ajoutée à `.env.example`, font chacun échouer le test.
- `env-guard.test.ts` : 4 cas Firebase Messaging ajoutés. `matching.test.ts` : libellé du délai.
- `reminders.int.test.ts` vérifie aussi le réglage : `super` lit et change le délai, ce qui est journalisé. Avec 5 h, une participation à `start_at − 4 h 59` reçoit son rappel. `modo` reçoit 403, et 0, 2,5 ou 25 donnent 400. Le délai est remis à 3 à la fin.
- Résultats : API 19 suites et 121 tests OK ; contrats 15 tests OK ; paquet `database` 18 tests unitaires OK.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 19 : rappels in-app et garantie d’absence de push. Ne branchez pas FCM. Fournis la recette 19-A à 19-H.
