<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 08 — Sessions JWT et écran OAuth (boutons) |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-07-socle-s3.md](etape-07-socle-s3.md) |
| Suivante | [etape-09-oauth-providers-liaison-profil.md](etape-09-oauth-providers-liaison-profil.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 08 — Sessions JWT et écran OAuth

**Objectif et résultat visible**

L’écran `/connexion` affiche **Continuer avec Google**, **Continuer avec Facebook** et **Continuer avec Instagram**, la case 18 ans et les liens vers les [conditions d’utilisation](../CONDITIONS_UTILISATION.md) et la [politique de confidentialité](../POLITIQUE_CONFIDENTIALITE.md) (mention **projet, non validé**). Les boutons peuvent encore renvoyer « disponible à l’étape 09 » si les verifiers ne sont pas branchés. Refresh et logout fonctionnent dès qu’une session de test est ouverte via `ENABLE_TEST_HOOKS` (session JWT seulement — pas un substitut OAuth).

**Exigences couvertes**

BF-AUTH-01 (UI), BF-AUTH-05, BF-AUTH-07 (case majorité), BF-AUTH-09 (journal sans secret), BF-AUTH-13 (prépare). Prépare la recette 19.

**Prérequis et dépendances**

Étapes 04, 05, 06. D17, D29, D34. Guide [AUTH_OAUTH_PROVIDERS.md](../AUTH_OAUTH_PROVIDERS.md). Les quatre secrets OAuth sont déjà exigés au démarrage.

**Travaux à réaliser, dans l’ordre**

1. Module `identity` : `POST /auth/refresh`, `POST /auth/logout`, modèle de session.
2. Cookie refresh `HttpOnly`, `Secure` derrière le proxy, `SameSite=Lax`. Rotation. Logout révoque.
3. Table `auth_identities` et colonnes `users.avatar_url`, `users.phone_confirmed_at` (rempli si le provider a fourni un numéro **ou** après saisie profil validée).
4. Écran connexion : trois boutons OAuth avec logos providers ([google](../../../design/brand/oauth/google.svg) / [facebook](../../../design/brand/oauth/facebook.svg) / [instagram](../../../design/brand/oauth/instagram.svg)), pas de champ téléphone ni OTP sur cet écran.
5. Rate-limit Redis sur les tentatives OAuth (IP).
6. Journaux : e-mail masqué, jamais de jeton.
7. Refuser tout jeton `demo:` ou corps inventé (même hors production).

**Règles techniques et métier**

Aucun mot de passe public. Aucun adaptateur OAuth simulé (D34).

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 08-A | Écran OAuth | Aucune session | Ouvrir `/connexion` | Trois boutons Google, Facebook, Instagram **avec logos providers**. Case 18 ans. Liens conditions + confidentialité (projet, non validé). Pas de champ OTP | Largeur 360 |
| 08-B | Session de test | `ENABLE_TEST_HOOKS=true`, hook de session JWT | Obtenir un access token, appeler `GET /me` | 200 | Le hook ne passe pas par Google/Meta |
| 08-C | Déconnexion | Session 08-B | Logout puis `GET /me` | 401. Refresh révoqué | `refresh_tokens.revoked_at` rempli |
| 08-D | Refresh | Session 08-B | Appeler `/auth/refresh` | Nouveau couple, ancien refresh révoqué |  |
| 08-E | Coupure | DevTools hors ligne | Cliquer un bouton OAuth | État « non envoyé », pas de compte |  |
| 08-F | Refus demo | Corps `{ "idToken": "demo:google:…" }` | `POST /auth/oauth/google` | 401 | Aucun user créé |

**Tests automatisés nécessaires**

Jest : rotation du refresh, révocation au logout, refus explicite des jetons `demo:`.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `08-A` — Écran OAuth
- [ ] `08-B` — Session de test
- [ ] `08-C` — Déconnexion
- [ ] `08-D` — Refresh
- [ ] `08-E` — Coupure
- [ ] `08-F` — Refus demo

**Livrables et règles**
- [ ] Écran OAuth sans OTP.
- [ ] Session refresh / logout prouvés.
- [ ] Aucun secret OAuth dans les logs.
- [ ] Jetons `demo:` refusés.
- [ ] Boutons OAuth avec logos officiels Google / Facebook / Instagram ([design/brand/oauth/](../../../design/brand/oauth/)).
- [ ] Tests automatisés exécutés avec succès : Jest : rotation refresh, logout, refus `demo:`.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : session sans révocation au logout, ou acceptation d’un jeton inventé.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 08 : sessions et écran OAuth. Branche les verifiers Google/Meta réels à l’étape 09. Fournis la recette 08-A à 08-F.

