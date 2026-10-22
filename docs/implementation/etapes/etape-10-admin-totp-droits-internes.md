<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 10 — Administration, second facteur, droits internes |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-09-oauth-providers-liaison-profil.md](etape-09-oauth-providers-liaison-profil.md) |
| Suivante | [etape-11-profils-modes-abonnement.md](etape-11-profils-modes-abonnement.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 10 — Accès administrateur, second facteur et droits internes

**Objectif et résultat visible**

Les comptes internes se connectent par identifiant, mot de passe et TOTP. Ils sont **créés uniquement par un super-admin BoulotFlash** (D35 / BF-AUTH-06). Chaque scope ne voit que ses écrans. Aucun provider OAuth public ne crée ni n’ouvre d’admin.

**Exigences couvertes**

BF-AUTH-06, BF-AD-01 en lecture préparatoire, BF-AD-09 pour la connexion admin journalisée. Rôles de la section 2.3 du CDC. D18, D35.

**Prérequis et dépendances**

Étapes 05 et 08. D18 non validé : TOTP, noté dans le registre.

**Travaux à réaliser, dans l’ordre**

1. Module admin dans `apps/api/src/modules/identity/admin-auth`.
2. Empreinte argon2id. Secret TOTP chiffré avec une clé d’environnement `TOTP_ENCRYPTION_KEY`. Codes de secours hachés, usage unique.
3. Écrans `/admin/connexion` : mot de passe, puis code. `noindex`.
4. Guard `AdminScope` par route. Support : `GET /admin/users/:id` sans suspendre. Modérateur : suspendre une offre de test. Finance : `GET /admin/payments` vide. Super : seul à ouvrir `PATCH /admin/communes` et `POST /admin/users`.
5. `POST /admin/users` (super) : crée SUPPORT / MODERATOR / FINANCE / SUPER avec mot de passe initial et secret TOTP à remettre hors bande.
6. Bootstrap du **premier** super : script one-shot documenté, ou seed si `SEED_DEMO=true` (refusé en production). Pas d’auto-inscription publique.
7. Journal `ADMIN_LOGIN` et `ADMIN_USER_CREATED` sans secret.
8. Seed des quatre admins de démo uniquement si `SEED_DEMO=true`.

**Règles techniques et métier**

Trois échecs TOTP bloquent 15 minutes sur le compte admin. Un scope manquant répond 403 sans liste de données. Un compte OAuth ne peut pas devenir admin.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 10-A | Connexion super | Seed démo ou bootstrap | `/admin/connexion`, `super`, mot de passe de test, code TOTP de l’application de test | Tableau admin vide autorisé | Ligne `ADMIN_LOGIN` |
| 10-B | TOTP faux | Compte `modo` | Bon mot de passe, code `000000` trois fois | Blocage | Pas de session |
| 10-C | Support sans suppression | `support` connecté | Ouvrir la fiche `C-COMPLET`. Chercher un bouton Supprimer ou Fermer | Lecture seule. Bouton absent | `POST /admin/users/{id}/close` répond 403 |
| 10-D | Finance sans modération | `finance` | Ouvrir la file des annonces | 403 ou menu absent | `GET /admin/payments` répond 200, liste vide |
| 10-E | OAuth n’est pas admin | Session `C-COMPLET` | Aller sur `/admin` | Redirection vers la connexion admin, pas vers les files |  |
| 10-F | Modérateur | `modo` | Suspendre `J-PUB-1` avec le motif « test recette » | Statut `SUSPENDED` | Journal de suspension. Rétablir ensuite pour ne pas casser le seed, ou resemer |
| 10-G | Création interne | `super` connecté | `POST /admin/users` avec scope SUPPORT | Compte créé, TOTP à configurer | Support / finance / modo ne peuvent pas appeler cette route (403) |

**Tests automatisés nécessaires**

Jest des guards : chaque scope contre les routes des autres. Argon2 : le mot de passe n’est pas en clair en base. Création admin réservée au super.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `10-A` — Connexion super
- [ ] `10-B` — TOTP faux
- [ ] `10-C` — Support sans suppression
- [ ] `10-D` — Finance sans modération
- [ ] `10-E` — OAuth n’est pas admin
- [ ] `10-F` — Modérateur
- [ ] `10-G` — Création interne

**Livrables et règles**
- [ ] Quatre scopes distingués.
- [ ] Second facteur obligatoire.
- [ ] Journal sans secret.
- [ ] Création des comptes internes uniquement par super (D35).
- [ ] Aucun compte admin créé via OAuth.
- [ ] Tests automatisés exécutés avec succès : Jest guards de scope + argon2 ; création admin réservée au super.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : un compte OAuth public qui obtient `role=ADMIN`, ou auto-inscription admin.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 10 : auth admin, création des comptes internes par le super, et guards de scope. Ne construis pas encore les files de modération complètes. Fournis la recette 10-A à 10-G.

