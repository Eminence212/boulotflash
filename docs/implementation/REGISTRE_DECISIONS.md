# Registre des décisions — BoulotFlash

| | |
| --- | --- |
| Source | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../PLAN_IMPLEMENTATION_BOULOTFLASH.md), section 2, et [CDC.md](../CDC.md) version 1.3 |
| Étape | 01 — cadrage |
| Règle | Une case « Tranché le » vide signifie que personne n’a validé ce point. Une recommandation de travail n’est pas une décision. |

Aucune hypothèse de la section 23 du CDC n’est marquée validée ici. Les communes du pilote ne sont pas choisies.

## Communes actives

Décision de pilote : **aucune**.

| Commune | Active au pilote | Tranché le |
| --- | --- | --- |
| Les 24 communes de Kinshasa | non | |

Le référentiel les contient toutes, inactives. L’activation de démonstration de Gombe, Ngaliema et Lemba, si `SEED_ACTIVATE_DEMO_COMMUNES=true`, n’est pas ce choix. Elle ne figure pas dans ce tableau.

Entretiens terrain attendus avant ce choix : environ 10 recruteurs et 20 candidats. Compte rendu : absent.

## Points ouverts

Textes repris sans les modifier. « Tranché le » reste vide.

| ID | Sujet | Recommandation de travail, non validée | Tranché le |
| --- | --- | --- | --- |
| D04 | Délai minimal de 2 heures si la clôture des sélections est plus proche. §9.3, §23. | Hypothèse non validée. Recommandation : refuser la proposition et afficher « La clôture des sélections est dans moins de 2 heures. Allongez-la avant de proposer une place. » Ne pas raccourcir le minimum en silence. Le worker expire à `expires_at`, qui est `min(émission + 2 h, clôture des sélections)` seulement quand ce minimum tient. | |
| D07 | Délai de contestation des déclarations. §9.4 « délai affiché », non chiffré. | Paramètre `DISPUTE_WINDOW_HOURS`, hypothèse de travail **48**, affichée avant la déclaration. Ce n’est pas une décision validée. Les deux déclarations sont enregistrées tout de suite. Le passage automatique à réalisée n’a lieu que si une partie déclare la réalisation et que l’autre ne conteste pas avant la fin de la fenêtre. | |
| D10 | Portée e-mail Google / Meta. Principe 1, BF-AUTH-01, BF-AUTH-10. | Hypothèse de travail, non validée : accepter tout compte Google (ou Meta) dont l’e-mail est vérifié, y compris une adresse d’organisation. Ne pas filtrer `@gmail.com`. Refus si non vérifié. `GOOGLE_EMAIL_POLICY=verified_google`. | |
| D14 | `EN_MODÉRATION` couvre aussi « service payant non confirmé ». §9.2. | Hypothèse de travail : la file de modération ne reçoit que la première publication d’un recruteur, une catégorie sensible, ou une nouvelle version substantielle. Si `services_payants` est vrai et qu’aucun droit n’est disponible, l’offre reste `DRAFT` et l’API répond `PAYMENT_REQUIRED`. Ce n’est pas une décision validée : le CDC met ce cas dans le statut de modération. | |
| D16 | Rappel 3 h avant début. | In-app seulement, `REMINDER_HOURS_BEFORE=3`, pas de push. | |
| D17 | Durée des jetons. BF-AUTH-05 « durée de vie courte », sans chiffre. | Hypothèse : access token 15 minutes, refresh token 30 jours, rotation à chaque renouvellement, cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Déconnexion révoque le refresh. | |
| D18 | Second facteur admin. BF-AUTH-06, sans méthode. | TOTP (application d’authentification), secret chiffré au repos, codes de secours hachés à usage unique. Pas de SMS pour l’admin. | |
| D19 | Coordonnées de repli des 24 communes. §7. | Ne pas inventer de latitudes dans le code comme si elles étaient officielles. L’étape 06 crée les communes inactives. L’étape 14 exige une source citée (export OpenStreetMap) déposée dans le dépôt avec sa date et son URL, puis relue. Tant qu’un centre manque et que Nominatim ne répond pas, la distance affiche « distance indisponible », pas un point approximatif silencieux. | |
| D22 | Prix dans les fourchettes. §10.3, §23. | Aucun prix de production par défaut. En test, quand l’interrupteur est activé, le jeu de données peut poser 3 USD la publication et 10 USD / 24 h la mise en avant, marqués comme valeurs de test. L’admin saisit le vrai tarif avant le pilote. | |
| D23 | Opérateurs mobile money. §10.4, §23. | L’adaptateur manuel accepte une référence et un opérateur choisi dans une liste désactivable. Aucun opérateur n’est activé en production tant que la décision terrain n’est pas écrite. Les tests locaux utilisent `MANUAL`. | |
| D24 | Textes juridiques. §12.4, §19. | Versions **0.1** validées pour le produit : [CONDITIONS_UTILISATION.md](CONDITIONS_UTILISATION.md), [POLITIQUE_CONFIDENTIALITE.md](POLITIQUE_CONFIDENTIALITE.md). L’écran `/connexion` exige l’acceptation des deux textes (majorité 18 ans + cases liées). | **22 octobre 2026** |
| D25 | Contact Nominatim. §5.5. | Variable `NOMINATIM_USER_AGENT`. Pas d’appel sans cette variable. Cache Redis 5 minutes. Pas plus d’une requête par repère et par modification. | |
| D28 | Changement de numéro. BF-AUTH-08. | Plus d’OTP public : demande enregistrée, traitée par le support uniquement. Délai 90 jours des comptes fermés. | |
| D29 | Suppression OTP public. | Connexion uniquement Google, Facebook, Instagram. Voir [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md). | |
| D30 | Identité depuis le provider. | E-mail, téléphone, photo repris du payload provider s’ils sont présents ; sinon saisie profil après connexion ; rien n’est inventé. | |
| D31 | Téléphone manquant. | Consultation OK ; candidature et publication → `PHONE_REQUIRED` jusqu’à saisie profil (`+243` pilote). | |
| D32 | Instagram via Meta. | App Meta + produit Instagram ; même secrets `META_APP_*`. | |
| D33 | Création / liaison. | Créer si inconnu ; sinon ouvrir ; e-mail vérifié lie sans second compte. | |
| D34 | OAuth toujours réel. | Aucun adaptateur simulé, aucun jeton `demo:`, ni en test ni en production. Secrets Google/Meta obligatoires au démarrage. | |
| D35 | Comptes internes. | Créés uniquement par un super-admin BoulotFlash. Pas d’auto-inscription admin, pas d’OAuth admin. | |
| D36 | Push FCM hors pilote. | Notifications = centre in-app uniquement. Pas de Firebase Messaging au pilote. | |

## Recommandations de travail déjà écrites dans le plan

Elles permettent de continuer les étapes qui ne sont pas bloquées. Elles ne sont pas validées non plus : « Tranché le » reste vide.

| ID | Statut dans ce registre | Tranché le |
| --- | --- | --- |
| D01 | Recommandation de travail : abonnement = droit d’accès gratuit ; `services_payants` = interrupteur séparé, faux au départ | |
| D02 | Recommandation de travail : une candidature historique par couple offre/candidat | |
| D03 | Recommandation de travail : places occupées = propositions en attente non expirées + participations non annulées | |
| D05 | Recommandation de travail : nouvelle version, propositions en attente annulées, acceptations inchangées | |
| D06 | Recommandation de travail : pas de statut supplémentaire pour une offre partiellement pourvue | |
| D08 | Recommandation de travail : codes anglais en base, libellés français à l’écran | |
| D09 | Recommandation de travail : pas de fusion silencieuse de deux comptes déjà distincts | |
| D11 | Recommandation de travail : les coordonnées sortent de l’API, pas d’un fichier ; URL privées courtes | |
| D12 | Recommandation de travail : ne pas dépendre d’un autre dépôt pour la carte | |
| D13 | Recommandation de travail : alerte automatique in-app dans le MVP ; alertes enregistrées hors pilote | |
| D15 | Recommandation de travail : numéro révélé = `users.phone` (provider ou profil), ou `mission_phone` validé par le support | |
| D20 | Recommandation de travail : une annulation libère la place | |
| D21 | Recommandation de travail : seuls `POST` et `FEATURED` existent | |
| D26 | Recommandation de travail : « nouveau recruteur » = aucune validation positive encore | |
| D27 | Fenêtre de nuit FCM. | Obsolète au pilote (plus de push). Conservé pour une réintroduction éventuelle. | |

Le détail de chaque recommandation reste dans la section 2 du plan. Ce registre n’en change pas le sens.

## Déjà écrit dans le CDC, sans nouvelle décision

Ces points ne sont pas des hypothèses à cocher. Ils restent la référence tant que le CDC n’est pas révisé.

| Sujet | Écrit dans le CDC | Tranché le |
| --- | --- | --- |
| Le candidat ne paie jamais | Principes 4 et 8, §10.1 | |
| `services_payants` faux au départ | BF-AD-11, §10.2 | |
| 24 communes inactives tant qu’une activation explicite n’a pas eu lieu | §7, §23 | |
| Auth publique OAuth Google / Facebook / Instagram ; pas d’OTP public | BF-AUTH-01 à 12, [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md) | |
| Notifications métier = in-app uniquement (pas de push) | §8, D36 | |
| Alerte d’offre correspondante : in-app seulement, une fois | §8.2, recette 20 | |

## Profil réseau de la recette 18

À remplir avant l’étape 26. Vide pour l’instant.

| Champ | Valeur |
| --- | --- |
| Modèle de téléphone | |
| Version Android | |
| Version de Chrome | |
| Débit descendant | |
| Latence | |
| Tranché le | |

## Avant le pilote public

Ces lignes bloquent l’ouverture publique, pas l’étape 02.

| Sujet | Tranché le |
| --- | --- |
| Communes réellement actives | |
| Opérateurs mobile money | |
| Tarifs fermes | |
| Politique Google, D10 | |
| Délai de contestation affiché, D07 | |
| Textes juridiques, D24 | |
| User-Agent Nominatim avec un contact réel, D25 | |
| Centres de communes sourcés, D19 | |
