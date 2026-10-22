<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 09 — Google, Facebook, Instagram, liaison, téléphone provider |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-08-sessions-jwt-ecran-oauth.md](etape-08-sessions-jwt-ecran-oauth.md) |
| Suivante | [etape-10-admin-totp-droits-internes.md](etape-10-admin-totp-droits-internes.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 09 — Google, Facebook, Instagram, liaison et complétion de profil

**Objectif et résultat visible**

Les trois boutons ouvrent une session via Google ou Meta **réels**. Le compte est créé s’il n’existe pas. E-mail, téléphone et photo sont repris du provider quand présents ; sinon l’utilisateur les saisit dans « Compléter mon profil ». Sans téléphone, consultation OK ; candidature et publication bloquées (`PHONE_REQUIRED`). Lier un provider déjà pris échoue sans fusion.

**Exigences couvertes**

BF-AUTH-01 à BF-AUTH-04, BF-AUTH-06, BF-AUTH-10 à BF-AUTH-13. Recette 19. D09, D10, D29–D35.

**Prérequis et dépendances**

Étape 08. Consoles Google et Meta configurées selon [AUTH_OAUTH_PROVIDERS.md](../AUTH_OAUTH_PROVIDERS.md) (comptes testeurs en mode Testing / développement). Secrets présents dans `.env.development` / `.env.test`.

**Travaux à réaliser, dans l’ordre**

1. `POST /auth/oauth/google`, `POST /auth/oauth/facebook`, `POST /auth/oauth/instagram` (chemins documentés dans l’API).
2. Vérification **uniquement live** : Google ID token / code ; Meta code exchange pour Facebook et Instagram. Isoler `OAuthTokenVerifier`. Aucune branche simulée.
3. Résolution de compte : `(provider, provider_user_id)` → sinon e-mail vérifié → sinon création. Écrire `auth_identities`, champs fournis par le provider.
4. Parcours « Compléter mon profil » + `PATCH /me` (ou routes profil) pour nom, téléphone `+243…`, photo facultative quand le provider ne les a pas fournis (BF-AUTH-12).
5. `POST /auth/oauth/link` pour rattacher un second provider à la session courante ; 409 `OAUTH_ACCOUNT_TAKEN` si déjà pris.
6. Guard téléphone (`phone` non null) sur probe + routes candidature/publication.
7. Aucun compte `ADMIN` via ces routes (D35).
8. Message UI si pas de numéro : invitation à le renseigner dans le profil ; tant qu’il manque, consultation seule.

**Règles techniques et métier**

Aucun mot de passe provider stocké. Pas de second compte pour le même e-mail vérifié. Instagram via Meta (D32). OAuth toujours réel (D34).

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 09-A | Création Google | Compte testeur Google, base sans l’e-mail | Continuer avec Google (flux réel) | Compte créé, session, `auth_identities` google | Photo / e-mail si Google les envoie |
| 09-B | Complétion téléphone | Compte Google sans numéro provider | Connexion puis « Compléter mon profil », saisir `+243…` | `phone` rempli ; avant saisie, probe → `PHONE_REQUIRED` | Après saisie, candidature autorisée si profil sinon complet |
| 09-C | Facebook | Compte testeur Meta Facebook | Continuer avec Facebook | Compte ou liaison e-mail | Provider = facebook |
| 09-D | Instagram | Compte testeur Instagram Meta | Continuer avec Instagram | Idem | Provider = instagram |
| 09-E | Même e-mail | Compte Google existant | Facebook avec le même e-mail vérifié | Même `userId`, nouvelle ligne `auth_identities` | Pas de second user |
| 09-F | Provider pris | Deux comptes | Lier le provider de l’autre | 409 `OAUTH_ACCOUNT_TAKEN` | Données inchangées |
| 09-G | Admin inaccessible | Session OAuth | `GET /admin/users` | 401 ou 403 |  |
| 09-H | E-mail non vérifié | Compte Google dont l’e-mail n’est pas vérifié (si reproductible) | Continuer avec Google | Refus, pas de compte |  |

**Tests automatisés nécessaires**

Jest résolveur (fixtures de payload **déjà vérifié** côté unit, sans faux serveur OAuth) : création, réouverture, liaison e-mail, refus fusion, refus non vérifié, guard téléphone, complétion profil. Les tests d’intégration auth appellent Google/Meta réels ou sont marqués skip hors CI avec secrets.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `09-A` — Création Google
- [ ] `09-B` — Complétion téléphone
- [ ] `09-C` — Facebook
- [ ] `09-D` — Instagram
- [ ] `09-E` — Même e-mail
- [ ] `09-F` — Provider pris
- [ ] `09-G` — Admin inaccessible
- [ ] `09-H` — E-mail non vérifié

**Livrables et règles**
- [ ] Recette 19 : trois providers réels (testeurs), pas de doublon e-mail, complétion profil, blocage sans téléphone.
- [ ] Aucune fusion silencieuse de deux historiques.
- [ ] Registre : D10, D29–D35 non validés terrain.
- [ ] Tests 09-A à 09-D réalisés avec comptes testeurs Google/Meta réels (pas de jeton inventé).
- [ ] Tests automatisés exécutés avec succès : Jest résolveur (fixtures vérifiées) : création, liaison, fusion refusée, téléphone, profil.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : second utilisateur pour le même e-mail, candidature possible sans `phone`, ou branche OAuth simulée dans le code.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 09 : OAuth Google/Facebook/Instagram **réels**, liaison, complétion de profil et garde téléphone. Suivre [AUTH_OAUTH_PROVIDERS.md](../AUTH_OAUTH_PROVIDERS.md). N’ajoute pas le TOTP admin. Fournis la recette 09-A à 09-H.
