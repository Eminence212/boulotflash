<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 18 — Notifications in-app et correspondance |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-17-revelation-revocation-coordonnees.md](etape-17-revelation-revocation-coordonnees.md) |
| Suivante | [etape-19-rappels-in-app-horaires.md](etape-19-rappels-in-app-horaires.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 18 — Notifications in-app, correspondance et déduplication

**Objectif et résultat visible**

Le centre de notifications montre les événements déjà produits. Quand une offre passe pour la première fois à `PUBLISHED` et correspond au profil, une seule ligne in-app est créée. Pas de push et pas d’e-mail pour cette alerte.

**Exigences couvertes**

§5.10, §8.2, §8.3, recette 20. BF-S-06 reste hors périmètre.

**Prérequis et dépendances**

Étapes 12 et 16. Push FCM **hors pilote** (D36 / CDC §8). Toute ligne `FCM` ou `EMAIL` pour `JOB_MATCH` est un échec de recette. L’étape 19 ajoute le rappel in-app.

**Travaux à réaliser, dans l’ordre**

1. À chaque événement de la matrice, insérer la ligne `IN_APP` dans la même transaction que l’action métier, sauf l’alerte de correspondance qui est mise en file pour ne pas allonger la requête de publication.
2. Worker `match-profiles` : comptes `ACTIVE`, disponibilité non coupée, compétence principale ou secondaire égale à la catégorie, commune du profil égale à la commune de l’offre, jour et créneau du début couverts, pas l’auteur, profil complet. Une ligne `job_profile_alerts` puis une notification `dedupe_key = job_match:{jobId}`.
3. Republication = autre `job_id` = autre alerte. Modification d’une offre déjà publiée : ne pas relancer ce processor. Les candidats concernés reçoivent l’événement « modification importante », in-app pour l’instant.
4. Écran notifications, lu / non lu.
5. Texte en deux phrases, heure, lieu public, action. Pas de numéro ni d’adresse exacte. Exemple du CDC pour la proposition et pour l’offre correspondante.
6. Refus, présélection, expiration : in-app seulement, déjà à cette étape.

**Règles techniques et métier**

Le worker peut être relancé : l’unicité `(job_id, user_id)` empêche un doublon. Une panne du worker laisse l’offre publiée. L’alerte manquante se rattrape au redémarrage, elle ne bloque pas la publication.

Créneaux : matin avant 12:00, après-midi de 12:00 à avant 18:00, soir à partir de 18:00, `Africa/Kinshasa`.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 18-A | Correspondance | `C-COMPLET` à Lemba, vente, disponible le soir. Offre de vente à Lemba qui commence à 19:00, validée par `modo` | Approuver l’offre. Ouvrir les notifications du candidat | Une notification « une mission correspond à votre profil », sans adresse exacte | Une ligne `channel = IN_APP`. Zéro ligne `FCM` ou `EMAIL` pour ce `related_id` |
| 18-B | Pas de correspondance | Candidat dont la commune ou la compétence diffère | Même publication | Pas de notification | Pas de ligne `job_profile_alerts` |
| 18-C | Auteur | Le recruteur a aussi le mode candidat et le même profil | Publier | Il ne reçoit pas l’alerte |  |
| 18-D | Doublon | Relancer le processor à la main |  | Toujours une seule notification | Contrainte unique |
| 18-E | Profil incomplet | `C-INCOMPLET` | Publication correspondante sur le papier | Rien |  |
| 18-F | Disponibilité coupée | Profil correspondant mais `is_available` faux | Publier | Rien |  |
| 18-G | Créneau | Offre à 10:00, candidat seulement le soir | Publier | Rien | Offre à 19:00 : une alerte |
| 18-H | Autres événements | Faire une candidature, une proposition, une acceptation, un refus | Lire le centre de chaque destinataire de la matrice | Les lignes in-app existent | Aucune ligne `FCM` |
| 18-I | Modification | Changer le montant d’une offre qui a des candidatures |  | Notification « modification importante » aux candidats concernés. Pas une seconde alerte « correspond au profil » | `job_profile_alerts` inchangé en nombre |
| 18-J | Texte | Ouvrir l’alerte |  | Deux phrases, heure, commune, pas de téléphone |  |

**Tests automatisés nécessaires**

Jest du filtre de correspondance : commune, compétence, créneau, auteur, incomplet, disponibilité. Test d’unicité au second passage. Test qu’aucune ligne FCM n’est créée pour `JOB_MATCH`.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [x] `18-A` — Correspondance
- [x] `18-B` — Pas de correspondance
- [x] `18-C` — Auteur
- [x] `18-D` — Doublon
- [x] `18-E` — Profil incomplet
- [x] `18-F` — Disponibilité coupée
- [x] `18-G` — Créneau
- [x] `18-H` — Autres événements
- [x] `18-I` — Modification
- [x] `18-J` — Texte

**Livrables et règles**
- [x] Recette 20.
- [x] Matrice in-app respectée pour les événements déjà possibles.
- [x] Publication réussie même si le worker est arrêté, l’alerte partant à son retour.
- [x] Tests automatisés exécutés avec succès : Jest filtre correspondance + unicité alerte in-app (zéro FCM).
- [x] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : un push ou un e-mail de correspondance, ou une seconde alerte pour la même offre.

**Compte rendu de recette — 24 octobre 2026**

Pile Docker locale (`docker compose --env-file .env.development`), API, worker et web reconstruits. Aucune migration : `job_profile_alerts` (unique `alerts_pair_uq`) et `notifications` (unique `notifications_dedupe_uq`) existaient déjà. Navigateur intégré en vue mobile (375 × 812), deux onglets (candidate et recruteur).

*Réalisation.* File BullMQ `match-profiles` : l’API met l’offre en file au premier passage en `PUBLISHED`, à la soumission directe ou à l’approbation, seulement si `published_at` était vide. Le worker calcule les profils, écrit `job_profile_alerts` puis une notification `IN_APP` `dedupe_key = job_match:{jobId}`, dans une transaction. Le filtre (`packages/database/src/matching.ts`) exige : compte `ACTIVE`, profil complet au sens de `/me`, disponibilité activée, compétence principale ou secondaire égale à la catégorie, même commune, jour et créneau du début couverts à l’heure de Kinshasa, et pas l’auteur. Les autres événements écrivent leur ligne dans la transaction de l’action. Centre in-app : `GET /notifications?unread=1`, `POST /notifications/{id}/read`, écran `/notifications` et cloche avec compteur dans l’en-tête. Aucun Firebase, aucun e-mail, aucune permission navigateur.

*Comptes.* Comme pour les étapes 16 et 17, les comptes démo ne peuvent pas se connecter (D34). Des comptes équivalents ont été créés par `POST /auth/dev-session` (hook de test), avec profils semés comme les fixtures :
- Grâce (C-COMPLET) : Lemba, vente, disponible le mardi soir.
- Sarah (C-B) : Gombe, vente, mardi soir.
- Jonas (C-INCOMPLET) : nom seulement.
- Merveille : comme Grâce, mais `is_available = false`.
- Fiston : comme Grâce, mais le mardi matin seulement.
- Boutique (R-2) : recruteur à Lemba, avec aussi un profil candidat identique à celui de Grâce.

Les offres de vente à Lemba ont été créées et soumises par l’API avec le jeton de R-2. Le premier dépôt est parti en `IN_REVIEW`, puis a été approuvé par `modo` (connexion mot de passe + TOTP de test, par l’API).

| ID | Attendu | Observé | Statut |
| --- | --- | --- | --- |
| 18-A | Une notification « correspond à votre profil », sans adresse ; une ligne `IN_APP`, zéro `FCM` ou `EMAIL` | Offre « Vente soirée Lemba (recette 18-A) », mardi 27 oct. à 19 h, approuvée par `modo`. Chez Grâce, la cloche affiche 1 et le centre montre « Une mission correspond à votre profil ». Base : 1 ligne `job_match`, canal `IN_APP`, 1 ligne `job_profile_alerts`. 0 ligne `EMAIL`. L’enum `NotificationChannel` ne contient que `IN_APP` et `EMAIL` : une ligne `FCM` est impossible | OK |
| 18-B | Pas de notification, pas de `job_profile_alerts` | Sarah (autre commune) : 0 notification, 0 alerte | OK |
| 18-C | L’auteur ne reçoit pas l’alerte | R-2, même profil candidat que Grâce : 0 alerte. Son centre ne montre que les candidatures reçues | OK |
| 18-D | Toujours une seule notification ; contrainte unique | `runJobMatch` relancé à la main dans le conteneur worker : 4 correspondances recalculées, 0 alerte et 0 notification créées ; Grâce a toujours 1 alerte. Insertion SQL directe d’un doublon : refusée par `alerts_pair_uq` et par `notifications_dedupe_uq` | OK |
| 18-E | Rien | Jonas (incomplet) : 0 | OK |
| 18-F | Rien | Merveille (indisponible) : 0 | OK |
| 18-G | Offre à 10 h, candidat du soir : rien ; offre à 19 h : une alerte | Offre à 10 h, publiée directement par R-2 (recruteur déjà publié) : Fiston (matin) a 1 alerte, Grâce 0. L’offre à 19 h (18-A) avait donné 1 alerte à Grâce et 0 à Fiston | OK |
| 18-H | Les lignes in-app existent pour chaque destinataire de la matrice ; aucune `FCM` | Grâce postule dans l’interface et Sarah par l’API : R-2 voit deux « Nouvelle candidature ». R-2 présélectionne Grâce puis propose une place dans l’interface : Grâce voit « Candidature présélectionnée » et « Une place vous est proposée » (texte du CDC, échéance comprise). Grâce accepte : elle voit « Place confirmée », R-2 « Place acceptée ». R-2 refuse Sarah : elle voit « Candidature non retenue ». Les 10 lignes des comptes de recette sont toutes `IN_APP`. Le déclin et la suspension sont couverts par le test automatisé | OK |
| 18-I | « Modification importante » aux candidats concernés, pas de seconde alerte ; `job_profile_alerts` inchangé | R-2 passe le montant de 15 à 20 USD dans le formulaire d’édition : l’offre passe « En modération ». Grâce (place acceptée) reçoit « L’offre devient … 20 USD la mission … Vos conditions déjà acceptées restent valables ». Sarah (refusée) ne reçoit rien. Après réapprobation par `modo` : `job_profile_alerts` = 4 et `job_match` = 4, avant comme après | OK |
| 18-J | Deux phrases, heure, commune, pas de téléphone | « « Vente soirée Lemba (recette 18-A) », mar. 27 oct., 19 h, Lemba, 15 USD la mission. Ouvrez l’offre pour postuler ; l’adresse exacte n’est pas dans ce message. » | OK |

*Worker arrêté.* Worker stoppé, offre « Vente soirée worker arrêté (recette 18) » publiée : l’offre est `PUBLISHED`, sans alerte, et le job `match-{id}` attend dans `bull:match-profiles:wait`. Au redémarrage du worker, le job est traité (`alertsCreated: 4`) et Grâce reçoit l’alerte.

*Recette 20.* OK, voir 18-A, 18-B, 18-C et 18-G : alerte in-app au profil correspondant, rien pour un profil qui ne correspond pas ni pour l’auteur, aucun e-mail, aucun push.

*Autres destinataires dans les totaux.* Pour l’offre 18-A, 4 alertes au total : Grâce, plus 3 comptes « Autre commune 18 » laissés par les tests Jest. Leur commune de test est Lemba, vente, mardi soir : `matchMismatch` confirme qu’ils correspondent.

*Journaux.* `docker logs` de l’API et du worker : aucune adresse, aucun numéro, aucune mention de Firebase, FCM ou SMTP.

*Anomalie corrigée pendant la recette.* Il manquait une virgule après l’apposition dans certains textes : « … 19 h, Lemba est présélectionnée ». Corrigé pour la présélection, le refus, la confirmation, l’expiration, la suspension et la modification. Les lignes créées avant la correction gardent l’ancien texte.

*Points à valider.*
- **Profil complet** : même définition que `/me` (nom, commune, compétence principale, au moins une disponibilité) plus compte `ACTIVE`. L’acceptation des règles, exigée pour postuler, n’est pas exigée pour recevoir l’alerte.
- **Déclin** : le CDC §5.10 cite le déclin sans destinataire dans la matrice §8.2 ; il est envoyé au recruteur.
- **Suspension** : seule la suspension d’offre existe aujourd’hui. Le recruteur reçoit le motif ; les candidats concernés (candidature soumise, présélectionnée, proposée ou acceptée, et participation non annulée) le reçoivent sans motif. La suspension de compte n’a pas encore de route : rien n’est envoyé pour elle.
- **Modification importante et propositions en cours** : la candidature `OFFERED` dont la proposition est annulée par la modification reçoit « La proposition en cours est annulée ». Mais sa candidature reste `OFFERED` (comportement antérieur à cette étape), ce qui empêche de lui proposer à nouveau une place. Ce point n’est pas corrigé ici.
- **Redis indisponible** : si Redis est indisponible au moment de la publication, l’offre est publiée mais l’alerte n’est pas mise en file. Aucun rattrapage n’existe pour ce cas ; seul l’arrêt du worker est rattrapé.
- **Compte à deux modes** : une notification de recruteur ouvre l’écran des candidatures, qui renvoie à l’accueil si le compte est en mode candidat.
- **Format de la date** : les textes donnent la date (« mar. 27 oct., 19 h ») plutôt que « demain 18 h » comme dans l’exemple du CDC.

*Tests automatisés.*
- `packages/database/src/__tests__/matching.test.ts` (17 tests) : créneaux de Kinshasa (bornes 12 h et 18 h, minuit local), commune, compétence principale et secondaire, créneau, auteur, profil incomplet, disponibilité coupée, compte inactif, texte.
- `apps/api/src/modules/notifications/__tests__/notifications.int.test.ts` (5 tests, API, worker BullMQ et Postgres réels) : 18-A à 18-F et 18-D (rejeu sans doublon, zéro `EMAIL`, tout `IN_APP`), 18-G, 18-I (réapprobation sans seconde alerte), 18-H (candidature, présélection, proposition, acceptation, déclin, refus, suspension avec et sans motif), lu / non lu (filtre `unread`, ligne d’un autre compte → 404, lecture idempotente, 401 sans session).
- Suite API complète : 17 suites, 111 tests OK, sur deux exécutions consécutives. Une première exécution, lancée 12 s après la reconstruction, avait échoué en bloc (29 tests sur 3 suites), vraisemblablement parce que l’API n’était pas encore prête. Paquet `database` : 20 tests unitaires OK. Web : 14 tests OK.
- Limite : retirer la garde `published_at` à l’approbation ne ferait échouer aucun test, car BullMQ garde le job terminé `match-{jobId}` et refuse un second job du même identifiant. La protection est double, mais seule la combinaison des deux est testée.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 18 : centre in-app et correspondance dédupliquée. Ne configure pas Firebase. Fournis la recette 18-A à 18-J.
