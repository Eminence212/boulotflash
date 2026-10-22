<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 27 — Déploiement, sauvegarde, restauration, pilote |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-26-pwa-reseau-accessibilite-performance.md](etape-26-pwa-reseau-accessibilite-performance.md) |
| Suivante | — |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 27 — Déploiement, supervision, sauvegarde, restauration et pilote

**Objectif et résultat visible**

Le même Compose démarre avec un fichier d’environnement de production sur la machine cible. Une restauration de PostgreSQL et du volume S3 est démontrée dans un Compose isolé. OAuth est déjà réel depuis les étapes 08–09 ; notifications = in-app seulement (pas d’essai FCM). Le pilote n’est pas déclaré ouvert.

**Exigences couvertes**

§12.2, §13.6, §13.7, §17 étape 4, recette 17. Section 11 du plan.

**Prérequis et dépendances**

Toutes les étapes précédentes recettées. D24 encore ouvert : ne pas annoncer l’ouverture publique. Communes pilotes encore non choisies : ne pas les activer « pour essayer ».

**Travaux à réaliser, dans l’ordre**

1. Documenter dans `docs/implementation/EXPLOITATION.md` (**à créer** à cette étape) les commandes de sauvegarde et de restauration, sans secret.
2. Sauvegarde : `pg_dump -Fc` et copie du volume MinIO, même horodatage, rétention 30 jours.
3. Restauration dans un autre répertoire Compose, autres noms de volumes. Vérifier une offre publique sans adresse, une photo, un justificatif par URL pré-signée.
4. Journaux `api`, `worker`, `proxy` : pas de numéro complet, pas de signature S3.
5. Confirmer OAuth live (déjà exigé en 08–09) sur les apps de test Google et Meta. Écrire le compte rendu. Suivre [AUTH_OAUTH_PROVIDERS.md](../AUTH_OAUTH_PROVIDERS.md). **Ne pas** configurer Firebase Messaging.
6. Le processus de production refuse secrets OAuth absents, toute variable `FCM_*` / messaging Firebase, `ENABLE_TEST_HOOKS` et `SEED_DEMO`. Le redémontrer.
7. Check-list de pilote : textes juridiques, communes, opérateurs, tarifs, User-Agent Nominatim, restauration, appareil de performance. Toutes les cases ouvertes restent ouvertes.
8. Ne pas activer `services_payants` pour le plaisir de la recette de production. L’activation de test reste sur l’environnement de test.

**Règles techniques et métier**

Une démonstration simulée n’est pas une validation opérateur. Le salaire reste hors plateforme le jour du pilote.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 27-A | Démarrage production locale | `.env.production` avec secrets OAuth réels (apps de test), **sans** FCM | `docker compose --env-file .env.production up -d` | Services sains derrière le proxy | Env sans `GOOGLE_CLIENT_SECRET`, ou avec `FCM_*`, ou jeton `demo:` → API refuse de démarrer / 401 |
| 27-B | Sauvegarde | Données de test | Exécuter le dump et la copie du volume | Deux archives datées | Elles ne sont pas dans git |
| 27-C | Restauration isolée | Second Compose, volumes vides | Restaurer le dump et le volume, démarrer | L’offre publique restaurée n’a pas d’adresse. La photo et le justificatif se relisent | Compte rendu daté, recette 17 |
| 27-D | Journaux | Parcours de connexion réelle ou de test | Lire `docker compose logs api` | Numéro masqué, pas de `X-Amz-Signature` |  |
| 27-E | Meta réel | App Meta de test | Continuer avec Facebook (et Instagram si disponible) | Compte créé ou retrouvé | Vérification Meta côté serveur |
| 27-F | Google réel | Client OAuth de test | Continuer avec Google | Le `sub` vérifié crée ou retrouve le compte | Vérification Google côté serveur |
| 27-G | In-app sans push | Parcours proposition en prod locale | Ouvrir le centre | Ligne in-app présente | `count` canal FCM = 0 ; pas de permission push exigée |
| 27-H | Pilote non ouvert | Registre | Lire les cases communes, juridique, opérateurs | Elles sont vides ou explicitement non validées. Aucun communiqué d’ouverture | Les 24 communes de production sont inactives tant que la décision n’est pas écrite |

**Tests automatisés nécessaires**

Le test de garde d’environnement de l’étape 04, rejoué. Pas de test automatisé qui enverrait un vrai SMS dans la CI.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `27-A` — Démarrage production locale
- [ ] `27-B` — Sauvegarde
- [ ] `27-C` — Restauration isolée
- [ ] `27-D` — Journaux
- [ ] `27-E` — Meta réel
- [ ] `27-F` — Google réel
- [ ] `27-G` — In-app sans push
- [ ] `27-H` — Pilote non ouvert

**Livrables et règles**
- [ ] Restauration démontrée sur un environnement isolé.
- [ ] OAuth réel confirmé ; zéro dépendance FCM (D36).
- [ ] Pilote public non déclaré.
- [ ] Tests automatisés exécutés avec succès : Rejeu garde env étape 04 ; pas d’envoi SMS réel en CI.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : restauration faite par-dessus les données vivantes, ou SMS simulé présenté comme reçu.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 27 : documents d’exploitation, sauvegarde et restauration isolée. N’active pas les communes du pilote et n’ouvre pas le service au public. Fournis la recette 27-A à 27-H et le compte rendu de restauration.
