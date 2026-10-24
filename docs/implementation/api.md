# Contrats API principaux

Préfixe `/api/v1`. Authentification : cookie de refresh et en-tête `Authorization: Bearer` pour l’accès. Les routes publiques n’exigent pas de jeton.

Erreur unique :

```json
{ "code": "PHONE_REQUIRED", "message": "Un numéro de téléphone est requis avant de postuler. Renseignez-le dans votre profil." }
```

Codes utilisés par les tests : `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `PHONE_REQUIRED`, `PROFILE_INCOMPLETE`, `SUBSCRIPTION_INACTIVE`, `PAYMENT_REQUIRED`, `SLOT_FULL`, `ALREADY_APPLIED`, `OWN_JOB`, `RATE_LIMIT`, `OFFER_NOT_OPEN`, `PROPOSAL_TOO_SHORT`, `PROPOSAL_EXPIRED`, `IDEMPOTENT_REPLAY`, `RIGHT_ALREADY_ISSUED`, `OAUTH_ACCOUNT_TAKEN`, `TERMS_REQUIRED`, `MODERATION_REQUIRED`.

`NOT_FOUND` est aussi la réponse quand l’objet existe mais ne doit pas être révélé à cet acteur (offre non publique, candidature d’un autre). Ne pas répondre 403 si cela confirme l’existence d’un identifiant privé. Exception : une offre `PUBLISHED`, `FILLED`, `EXPIRED`, `CANCELLED` ou `COMPLETED` a une page publique sans données privées. `DRAFT`, `IN_REVIEW`, `REJECTED`, `SUSPENDED` répondent `NOT_FOUND` au public.

Idempotence : en-tête `Idempotency-Key` sur les POST de candidature, proposition, acceptation, déclaration et confirmation de paiement. Même clé et même corps : rejouer la réponse enregistrée. Même clé et corps différent : 409 `VALIDATION`.

## Auth

Pas d’OTP public. OAuth **toujours réel** (Google / Meta). Configuration des consoles : [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md).

| Méthode et chemin | Acteur | Préconditions | Corps utile | Réponse | Erreurs |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/oauth/google` | Public | ID token ou code Google vérifié auprès de Google | `{ "idToken" }` ou `{ "code" }` | Session ; crée le compte si besoin ; lie si e-mail déjà connu | 401 jeton invalide / non vérifiable. 409 politique e-mail |
| `POST /auth/oauth/facebook` | Public | Code / token Meta Facebook vérifié auprès de Meta | `{ "accessToken" }` ou `{ "code" }` | Idem | 401 |
| `POST /auth/oauth/instagram` | Public | Code / token Meta Instagram vérifié auprès de Meta | `{ "accessToken" }` ou `{ "code" }` | Idem | 401 |
| `POST /auth/oauth/link` | Session | Provider libre | `{ "provider", "idToken" \| "accessToken" \| "code" }` | Nouvelle ligne `auth_identities` | 409 `OAUTH_ACCOUNT_TAKEN` |
| `POST /auth/refresh` | Cookie | Refresh non révoqué | vide | Nouveau couple de jetons, ancien refresh révoqué | 401 |
| `POST /auth/logout` | Session |  | vide | 204, refresh révoqué |  |
| `POST /admin/auth/login` | Public admin | Identifiant | `{ "username", "password" }` | `{ "totpRequired": true }` sans session métier | 401 |
| `POST /admin/auth/totp` | Défi admin | Code TOTP | `{ "code" }` | Session admin | 401 |

Résolution : `(provider, provider_user_id)` connu → ouvrir ; sinon e-mail vérifié connu → ouvrir et attacher ; sinon créer. Jamais de second utilisateur pour le même e-mail vérifié. Champs absents du provider → complétion profil. Recette 19. Jetons `demo:` → 401.

Exemple de refus de fusion :

```json
POST /api/v1/auth/oauth/link
{ "provider": "google", "idToken": "<id_token Google réel d'un autre compte>" }

409
{ "code": "OAUTH_ACCOUNT_TAKEN", "message": "Ce compte est déjà lié à un autre utilisateur. Connectez-vous avec ce provider, ou contactez le support." }
```

## Profils

| Méthode et chemin | Acteur | Règle |
| --- | --- | --- |
| `GET /me` | Session | Modes disponibles, téléphone, abonnement, manques du profil (flags pour « Compléter mon profil ») |
| `PATCH /me` | Session | Complète les champs manquants : `displayName`, `phone` (`+243…` pilote), `avatarUrl` facultatif. Ne crée pas d’admin |
| `PUT /me/worker-profile` | Candidat | Nom 2–80, commune active, compétence active, disponibilités |
| `PUT /me/worker-profile/availability` | Candidat | Remplace les lignes. `isAvailable: false` désactive sans fermer |
| `POST /me/employer-profile` | Session avec téléphone renseigné | Crée le profil et l’abonnement `ACTIVE` dans la même transaction. Idempotent si le profil existe |
| `PUT /me/employer-profile` | Recruteur | Ne change pas l’abonnement |
| `POST /me/mode` | Les deux profils | `{ "mode": "WORKER" \| "EMPLOYER" }` |

## Offres

| Méthode et chemin | Acteur | Préconditions | Réponse utile |
| --- | --- | --- | --- |
| `POST /jobs` | Recruteur | Abonnement `ACTIVE`, téléphone confirmé | Brouillon. Pas encore publique |
| `PUT /jobs/{id}` | Propriétaire | `DRAFT` ou `REJECTED` | Brouillon mis à jour |
| `POST /jobs/{id}/submit` | Propriétaire | Champs complets, droit disponible | `IN_REVIEW` ou `PUBLISHED` selon D26 et D14 |
| `POST /jobs/{id}/republish` | Propriétaire | Offre à lui | Nouveau brouillon, nouvel id, sans candidatures |
| `GET /jobs` | Public | Filtres ville, commune, catégorie, date, devise, `q` | Page, sans privé |
| `GET /jobs/{id}` | Public si statut visible |  | Détail public |
| `POST /admin/jobs/{id}/approve` | Modérateur ou super | `IN_REVIEW` | `PUBLISHED` au premier passage |
| `POST /admin/jobs/{id}/reject` | Modérateur | Motif | `REJECTED` |
| `POST /admin/jobs/{id}/suspend` | Modérateur | Motif | `SUSPENDED` |

Exemple public, à comparer en recette. Ces champs sont les seuls :

```json
{
  "id": "00000000-0000-4000-8000-000000000101",
  "title": "Service soirée",
  "category": "Service, plonge et cuisine",
  "amount": 1500,
  "currency": "USD",
  "payUnit": "MISSION",
  "startAt": "2026-11-02T17:00:00.000Z",
  "durationHours": 5,
  "commune": "Gombe",
  "publicLandmark": "près du marché",
  "publicLatitude": -4.31,
  "publicLongitude": 15.3,
  "placesRemaining": 2,
  "featured": false,
  "sharePath": "/missions/00000000-0000-4000-8000-000000000101",
  "applicationsOpen": true
}
```

`amount` 1500 signifie 15,00 USD. L’interface affiche « 15 USD la mission ». Aucune clé `addressPrivate`, `missionPhone`, `privateLatitude`, `privateLongitude`.

Soumission invalide :

```json
PUT /api/v1/jobs/{id}
{ "amount": 0, "payUnit": "MISSION", "title": "À discuter" }

400
{ "code": "VALIDATION", "message": "Indiquez le montant pour publier." }
```

## Candidature et sélection

| Méthode et chemin | Acteur | Idempotence | Erreurs |
| --- | --- | --- | --- |
| `POST /jobs/{id}/applications` | Candidat | Clé | `ALREADY_APPLIED`, `OWN_JOB`, `RATE_LIMIT`, `PHONE_REQUIRED`, `OFFER_NOT_OPEN` |
| `POST /applications/{id}/withdraw` | Candidat |  | Seulement `SUBMITTED` ou `SHORTLISTED` |
| `POST /applications/{id}/shortlist` | Recruteur propriétaire |  | Ne réserve pas |
| `POST /applications/{id}/reject` | Recruteur |  | `REJECTED` |
| `POST /applications/{id}/offer` | Recruteur | Clé | `SLOT_FULL`, `PROPOSAL_TOO_SHORT` |
| `POST /selection-offers/{id}/accept` | Candidat concerné | Clé | `PROPOSAL_EXPIRED`, `SLOT_FULL` |
| `POST /selection-offers/{id}/decline` | Candidat | Clé | Libère la place |

Corps de candidature : `{ "availabilityConfirmed": true, "message": "Je peux venir." }`. `availabilityConfirmed` doit être vrai.

Corps d’offre de place : vide. L’échéance est calculée par le serveur. Le client ne l’impose pas.

Jusqu’à l’étape 16 incluse, cette réponse ne contient que `participationId` et les statuts. Le bloc `contact` est ajouté à l’étape 17, et seulement pour une partie de la participation encore `CONFIRMED`.

Acceptation réussie, à partir de l’étape 17 :

```json
{
  "applicationStatus": "ACCEPTED",
  "participationId": "00000000-0000-4000-8000-000000000201",
  "participationStatus": "CONFIRMED",
  "contact": {
    "missionPhone": "+243820000002",
    "addressPrivate": "10 avenue de test, Gombe",
    "privateLatitude": -4.303,
    "privateLongitude": 15.313
  }
}
```

Le contact n’est dans cette réponse que pour le candidat qui vient d’accepter et, sur une lecture séparée, pour le recruteur propriétaire. Un second appel avec la même clé renvoie la même participation, pas une deuxième.

## Contact

`GET /participations/{id}/contact`

- 200 pour le candidat et le recruteur de cette participation si `status = CONFIRMED` et `contact_revoked_at` est null
- 404 pour toute autre personne, y compris l’autre recruteur
- 404 après annulation, même pour les parties
- Le super-admin passe par `GET /admin/participations/{id}/contact`, qui écrit `contact_access_logs` puis renvoie les champs. Les autres scopes admin reçoivent 403.

En-têtes de cette réponse : `Cache-Control: no-store`.

## Fin de mission

`POST /participations/{id}/declarations`

```json
{ "outcome": "COMPLETED" }
```

`outcome` : `COMPLETED`, `NO_SHOW`, `CANCELLED`. Chaque partie écrit la sienne. Si elles diffèrent, `disputeFlag: true`.

`POST /participations/{id}/payment-declaration` recruteur : `{ "declared": true }`.

`POST /participations/{id}/payment-confirmation` candidat : `{ "received": true }` ou `{ "received": false }`. `received: false` pose le désaccord. Ce n’est pas un paiement BoulotFlash.

`POST /participations/{id}/feedback` : `{ "comment": "Présent à l'heure." }` maximum 500 caractères. Absent des GET publics de profil.

## Notifications

`GET /notifications?unread=1` — lignes `IN_APP` du compte seulement. Réponse : `{ "unreadCount": 2, "items": [{ "id", "type", "title", "message", "href", "read", "readAt", "createdAt" }] }`, 50 lignes au plus, les plus récentes d’abord. `href` est l’écran à ouvrir, calculé selon le rôle du destinataire. `Cache-Control: no-store`.

`POST /notifications/{id}/read` — idempotent : la première date de lecture est conservée. Ligne d’un autre compte : 404.

`POST /device-tokens` — **hors pilote** (D36). Pas d’enregistrement FCM tant que le push n’est pas réintroduit.

Aucun endpoint pour déclencher l’alerte de correspondance. Elle naît dans le worker au premier `PUBLISHED`.

## Facturation

| Méthode et chemin | Acteur | Règle |
| --- | --- | --- |
| `GET /billing/status` | Recruteur | `{ "servicesPayants": false, "subscription": "ACTIVE", "label": "Services gratuits" }` |
| `POST /billing/payments` | Recruteur | Refus 409 si `services_payants` est faux. Sinon crée `PENDING` |
| `POST /billing/payments/{id}/evidence` | Recruteur | URL pré-signée. Ne confirme pas |
| `POST /admin/payments/{id}/confirm` | Finance ou super | Corps `{ "reference", "amount", "received": true }`. `received: false` ou capture seule : rester en vérification |
| `POST /admin/settings/services-payants` | Super | `{ "enabled": true }`, journal `SERVICES_PAYANTS_ON` |
| `GET /admin/settings` | Super | Réglages modifiables : `reminderHoursBefore` et ses bornes |
| `PATCH /admin/settings/reminder-hours` | Super | `{ "hours": 3 }`, entier de 1 à 24, écrit dans `platform_settings.reminder_hours_before`, journal `SETTINGS_REMINDER_HOURS` avec `{ previous, next }` |

Seconde confirmation du même paiement :

```json
409
{ "code": "RIGHT_ALREADY_ISSUED", "message": "Ce paiement a déjà livré un service." }
```

Si la même `Idempotency-Key` est rejouée, la réponse reste le 200 initial.

## Administration

- `GET /admin/users?phone=&name=&role=&status=`
- `POST /admin/users` (super uniquement) : crée un compte interne `{ "username", "password", "adminScope" }` — SUPPORT, MODERATOR, FINANCE ou SUPER. Jamais via OAuth (D35). Bootstrap du premier super : script one-shot ou seed démo hors production
- `POST /admin/users/{id}/suspend` `{ "reason" }`
- `POST /admin/users/{id}/restore`
- `POST /admin/users/{id}/close`
- `GET /admin/jobs/review-queue`
- `GET /admin/reports`
- `POST /admin/reports/{id}/resolve` `{ "resolution" }`
- `POST /admin/reports/{id}/appeal` côté utilisateur suspendu, une fois
- `PATCH /admin/categories/{id}` `{ "isActive" }`
- `PATCH /admin/communes/{id}` `{ "isActive": true }`
- `PUT /admin/prices`
- `GET /admin/metrics`
- `POST /admin/exports` `{ "from", "to", "kind": "USERS"|"JOBS"|"PAYMENTS" }` → tâche worker, lien pré-signé 5 minutes, objet supprimé sous 7 jours

## Fichiers

`POST /files/avatar-upload` → `{ "uploadUrl", "key" }`. Le téléphone envoie le PUT à `uploadUrl`. Puis `POST /files/avatar-complete`. Le worker produit la vignette.

`POST /files/structure-upload` vers le bucket privé. Lecture : `GET /admin/structure-checks/{id}/file` ou le titulaire, URL 5 minutes.

## Santé

`GET /health` sans secret : `{ "postgres": "ok", "redis": "ok", "s3": "ok" }`. Aucune dépendance push / Firebase.

## Horloge de test

`POST /test/clock` `{ "at": "2026-11-01T20:30:00.000Z" }` seulement si `ENABLE_TEST_HOOKS=true`. Absente du build de production : la route n’est pas enregistrée.
