# Jeux de données

Ces comptes sont fictifs. Le seed ne tourne que si `SEED_DEMO=true`. En production la variable est refusée au démarrage.

Mot de passe admin de test, identique pour tous les comptes internes : `BoulotFlash-Admin-Test-1`. Il n’est pas un secret de production. Le TOTP de test est le secret Base32 `JBSWY3DPEHPK3PXP` tant que `TOTP_ADAPTER=fixed`. Ce secret est refusé si l’environnement est la production.

Téléphones au format `+243` (provider ou saisie profil). Le seed préremplit des `users` / `auth_identities` pour les recettes **métier** ; il ne remplace pas une connexion OAuth réelle. Les recettes auth (étapes 08–09, critère 19) utilisent des comptes testeurs Google / Meta — voir [AUTH_OAUTH_PROVIDERS.md](AUTH_OAUTH_PROVIDERS.md) §8.

## Comptes

| Code | Identité OAuth / téléphone | Rôle | État utile |
| --- | --- | --- | --- |
| `C-COMPLET` | Google `google-sub-complet`, e-mail `complet@demo.boulotflash.test`, tél. +243810000001 | Candidat | Grâce, Lemba, compétence vente, disponibilités, téléphone renseigné, règles acceptées |
| `C-INCOMPLET` | Google `google-sub-incomplet`, e-mail `incomplet@demo.boulotflash.test`, tél. +243810000002 | Candidat | Nom seulement, pas de commune, pas de compétence |
| `C-A` | Facebook `fb-sub-a`, tél. +243810000003 | Candidat | Patrick, Ngaliema, déménagement, disponible, essais simultanés |
| `C-B` | Instagram `ig-sub-b`, tél. +243810000004 | Candidat | Sarah, Ngaliema, déménagement, disponible |
| `C-NOPHONE` | Google `google-sub-grace`, e-mail `grace.demo@gmail.com`, **pas de téléphone** | Candidat | Consultation OK, candidature bloquée (`PHONE_REQUIRED`) jusqu’à complétion profil |
| `C-FERME` | ex-tél. +243810000099 | Candidat | Fermé, identifiants bloqués 90 jours |
| `R-1` | Google + tél. +243820000001 | Recruteur | Restaurant, Gombe, abonnement `ACTIVE`, aucune offre encore validée |
| `R-2` | Facebook + tél. +243820000002 | Recruteur | Boutique, Ngaliema, abonnement `ACTIVE`, déjà une offre validée |
| `R-DUAL` | Google + tél. +243830000001 | Les deux | Profils candidat et recruteur, abonnement `ACTIVE` |
| `R-SUSPENDU` | +243820000003 | Recruteur | Compte `SUSPENDED` |
| `R-ABO-EXPIRE` | +243820000004 | Recruteur | Compte actif, abonnement `EXPIRED` |
| `A-SUPPORT` | identifiant `support` | Support | Créé par super (ou seed démo). TOTP de test |
| `A-MODO` | identifiant `modo` | Modérateur | Créé par super (ou seed démo). TOTP de test |
| `A-FINANCE` | identifiant `finance` | Finance | Créé par super (ou seed démo). TOTP de test |
| `A-SUPER` | identifiant `super` | Super-admin | Bootstrap / seed démo uniquement pour le premier super. TOTP de test |

`C-NOPHONE` sert à prouver le garde téléphone et le parcours « Compléter mon profil ». Chaque compte public du seed a une ligne `auth_identities`. Les comptes internes ne sont jamais créés par OAuth (D35) : hors seed, uniquement `POST /admin/users` par un super.

## Offres

Les dates sont relatives à l’horloge de test, pas à la date du jour du rédacteur. Au seed, `start_at` vaut « dans 3 jours, 18:00 Africa/Kinshasa », `apply_deadline` « dans 2 jours, 12:00 », `selection_deadline` « dans 2 jours, 18:00 », sauf mention.

| Code | Recruteur | Statut | Places | Catégorie | Usage |
| --- | --- | --- | --- | --- | --- |
| `J-PUB-1` | R-2 | `PUBLISHED` | 2 | Service, plonge et cuisine | Parcours nominal, Gombe, 15 USD la mission, repère « près du marché » |
| `J-PUB-UNIQUE` | R-2 | `PUBLISHED` | 1 | Déménagement | Concurrence, Ngaliema |
| `J-DRAFT` | R-1 | `DRAFT` | 1 | Vente | Brouillon |
| `J-REVIEW` | R-1 | `IN_REVIEW` | 1 | Vente | Première publication |
| `J-SENSIBLE` | R-2 | `IN_REVIEW` | 1 | Électricité | Catégorie sensible |
| `J-DOMICILE` | R-2 | `IN_REVIEW` | 1 | Ménage, `at_private_home=true` | Sensible conditionnel |
| `J-REJET` | R-1 | `REJECTED` | 1 | Vente | Motif visible |
| `J-SUSPENDUE` | R-2 | `SUSPENDED` | 1 | Inventaire | Pas de lien public |
| `J-ANNULEE` | R-2 | `CANCELLED` | 1 | Inventaire | Lien ouvrable, candidatures closes, sans privé |
| `J-POURVUE` | R-2 | `FILLED` | 1 | Saisie | Participation confirmée de C-COMPLET |
| `J-EXPIREE` | R-2 | `EXPIRED` | 1 | Inventaire | Date limite passée, aucune acceptation |
| `J-PROCHE` | R-2 | `PUBLISHED` | 1 | Service | Clôture des sélections dans 30 minutes, pour le cas D04 |

Montant de `J-PUB-1` : 15 USD, base mission, paiement espèces en fin de mission. En base, les montants USD sont des entiers de centimes : 15 USD s’enregistre `1500`. Les montants CDF sont des francs entiers. L’écran affiche « 15 USD la mission ». Adresse privée du seed : « 10 avenue de test, Gombe ». Elle ne sort pas des réponses publiques.

## Candidatures de seed

- `C-A` et `C-B` ont une candidature `SUBMITTED` sur `J-PUB-UNIQUE`.
- `C-COMPLET` a une candidature `SUBMITTED` sur `J-PUB-1`.
- `J-POURVUE` a une participation `CONFIRMED` entre R-2 et C-COMPLET, version 1 figée.

## Ville et communes à semer

Ville : Kinshasa, `is_active = false` tant que le pilote n’a pas choisi de l’ouvrir. Aucune latitude.

Les 24 communes sont inactives. Aucune n’est marquée commune pilote. Pas de latitude ni de longitude dans ce jeu : D19 n’est pas tranché.

| Commune | `is_active` | Pilote | Latitude | Longitude |
| --- | --- | --- | --- | --- |
| Bandalungwa | false | non | | |
| Barumbu | false | non | | |
| Bumbu | false | non | | |
| Gombe | false | non | | |
| Kalamu | false | non | | |
| Kasa-Vubu | false | non | | |
| Kimbanseke | false | non | | |
| Kinshasa | false | non | | |
| Kintambo | false | non | | |
| Kisenso | false | non | | |
| Lemba | false | non | | |
| Limete | false | non | | |
| Lingwala | false | non | | |
| Makala | false | non | | |
| Maluku | false | non | | |
| Masina | false | non | | |
| Matete | false | non | | |
| Mont-Ngafula | false | non | | |
| Ndjili | false | non | | |
| Ngaba | false | non | | |
| Ngaliema | false | non | | |
| Ngiri-Ngiri | false | non | | |
| N’sele | false | non | | |
| Selembao | false | non | | |

## Catégories à semer

26 catégories, actives, dans l’ordre du CDC section 6. `is_sensitive` vient du tableau. Ménage et lessive ont `sensitive_if_home = true` : elles passent en revue seulement si l’offre est au domicile.

| Ordre | Famille | Catégorie | Sensible |
| --- | --- | --- | --- |
| 1 | Maison et personne | Ménage et nettoyage | Si domicile |
| 2 | Maison et personne | Lessive, repassage et cuisine domestique | Si domicile |
| 3 | Maison et personne | Garde d’enfants | Oui |
| 4 | Maison et personne | Aide aux personnes âgées | Oui |
| 5 | Maison et personne | Coiffure, esthétique et soins non médicaux | Non |
| 6 | Commerce et rue | Vente, promotion et distribution | Non |
| 7 | Commerce et rue | Caisse, accueil et tenue de boutique | Non |
| 8 | Commerce et rue | Inventaire et rangement | Non |
| 9 | Salle et événement | Service, plonge et cuisine | Non |
| 10 | Salle et événement | Événementiel | Non |
| 11 | Déplacement | Livraison et coursier | Non |
| 12 | Déplacement | Déménagement et chargement | Non |
| 13 | Déplacement | Chauffeur | Non |
| 14 | Chantier et technique | Manœuvre | Non |
| 15 | Chantier et technique | Peinture, bricolage et jardinage | Non |
| 16 | Chantier et technique | Plomberie | Oui |
| 17 | Chantier et technique | Électricité | Oui |
| 18 | Chantier et technique | Mécanique légère | Non |
| 19 | Bureau et connaissance | Saisie, secrétariat et accueil | Non |
| 20 | Bureau et connaissance | Cours et aide aux devoirs | Non |
| 21 | Bureau et connaissance | Traduction et interprétation | Non |
| 22 | Bureau et connaissance | Photo, vidéo et son | Non |
| 23 | Terrain | Enquête et collecte de données | Non |
| 24 | Terrain | Sensibilisation communautaire | Oui |
| 25 | Terrain | Sécurité ponctuelle | Oui |
| 26 | Terrain | Couture et retouche | Non |

Aucun prix n’est attaché à une catégorie. Le candidat ne paie pas pour en choisir une.

## Profil réseau de la recette 18

Les valeurs sont dans [REGISTRE_DECISIONS.md](REGISTRE_DECISIONS.md). Elles sont vides. Ne pas les inventer avant l’étape 26.

## Réglages de seed

- `services_payants = false`
- 24 communes, `is_active = false`, sans latitude inventée
- Pour les essais de formulaire, le seed peut activer **uniquement en démo** Gombe, Ngaliema et Lemba, si `SEED_ACTIVATE_DEMO_COMMUNES=true`. Cette activation n’est pas la décision de pilote. Le document de pilote doit la refaire explicitement.
- Catégories du CDC, actives, `is_sensitive` selon le tableau. Ménage et lessive ont `sensitive_if_home = true` plutôt qu’un booléen unique faux.
- Aucun prix commercial actif
- `platform_settings` aux hypothèses de la section 2 du plan

## Commande

Le référentiel (ville, 24 communes inactives, 26 catégories, réglages, termes interdits) est écrit au démarrage de l'API, puis peut être relancé. Les comptes, profils, abonnements et offres de ce document ne sont écrits que si `SEED_DEMO=true`.

Sans activer de commune :

```
docker compose --env-file .env.development exec -T api pnpm --filter @boulotflash/database seed
```

Démo explicite. Gombe, Ngaliema et Lemba seulement. Ce n'est pas la décision de pilote :

```
docker compose --env-file .env.development exec -T -e SEED_DEMO=true -e SEED_ACTIVATE_DEMO_COMMUNES=true api pnpm --filter @boulotflash/database seed
```

Les identifiants admin (`support`, `modo`, `finance`, `super`) sont dans `users.username`. Le mot de passe de test est haché en argon2id. Quand `SEED_DEMO=true` et `TOTP_ADAPTER=fixed`, le secret Base32 de test est chiffré dans `admin_totp_secrets.secret_encrypted`. Il n'est pas recopié en clair. Un code de secours de test, `BF-RECOVERY-TEST-1`, est stocké sous forme d'empreinte, à usage unique. Le téléphone de `C-FERME` n'est pas gardé en clair. Son empreinte SHA-256 hex est dans `closed_identifiers`, réutilisable après 90 jours. Les offres n'ont aucune latitude.

## Ce que le seed ne fait pas

Il ne marque pas une commune comme choisie pour le pilote. Il ne confirme pas un paiement. Il n’envoie pas de SMS ni de push réel.
