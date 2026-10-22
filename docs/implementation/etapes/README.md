# Étapes d’implémentation BoulotFlash

Chaque étape est un **document séparé**. Ne pas les fusionner.

| | |
| --- | --- |
| Produit | [CDC.md](../../CDC.md) |
| Plan | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) |
| Jeux de données | [jeux-de-donnees.md](../jeux-de-donnees.md) |
| API | [api.md](../api.md) |
| Modèle | [modele-donnees.md](../modele-donnees.md) |
| Recette | [recette.md](../recette.md) |
| Conditions d’utilisation | [CONDITIONS_UTILISATION.md](../CONDITIONS_UTILISATION.md) (projet, non validé) |
| Politique de confidentialité | [POLITIQUE_CONFIDENTIALITE.md](../POLITIQUE_CONFIDENTIALITE.md) (projet, non validé) |

## Ordre (plan §9)

| Étape | Document |
| --- | --- |
| 01 | [Cadrage, décisions et jeux de données](etape-01-cadrage-decisions-jeux-de-donnees.md) |
| 02 | [Logo et design system](etape-02-logo-design-system.md) |
| 03 | [Maquettes mobiles](etape-03-maquettes-mobiles.md) |
| 04 | [Socle du dépôt et Docker Compose](etape-04-socle-depot-docker-compose.md) |
| 05 | [Migrations, statuts, contraintes de places](etape-05-migrations-statuts-contraintes.md) |
| 06 | [Référentiels et réglages](etape-06-referentiels-reglages.md) |
| 07 | [Socle S3](etape-07-socle-s3.md) |
| 08 | [Sessions JWT et écran OAuth (boutons)](etape-08-sessions-jwt-ecran-oauth.md) |
| 09 | [Google, Facebook, Instagram, liaison, téléphone provider](etape-09-oauth-providers-liaison-profil.md) |
| 10 | [Administration, second facteur, droits internes](etape-10-admin-totp-droits-internes.md) |
| 11 | [Profils, modes, abonnement initial](etape-11-profils-modes-abonnement.md) |
| 12 | [Offres, validation, modération, versions](etape-12-offres-validation-moderation-versions.md) |
| 13 | [Recherche, détail public, partage](etape-13-recherche-detail-public-partage.md) |
| 14 | [Carte, Nominatim, Haversine](etape-14-carte-nominatim-haversine.md) |
| 15 | [Candidature et limite anti-spam](etape-15-candidature-anti-spam.md) |
| 16 | [Propositions, réservation, acceptation, concurrence](etape-16-propositions-acceptation-concurrence.md) |
| 17 | [Révélation et révocation des coordonnées](etape-17-revelation-revocation-coordonnees.md) |
| 18 | [Notifications in-app et correspondance](etape-18-notifications-in-app-correspondance.md) |
| 19 | [Rappels in-app et horloge Kinshasa](etape-19-rappels-in-app-horaires.md) |
| 20 | [Réalisation, absence, annulation, salaire, retours](etape-20-realisation-annulation-salaire-retours.md) |
| 21 | [Signalements, recours, files admin](etape-21-signalements-recours-files-admin.md) |
| 22 | [Services gratuits, paiement, droits uniques](etape-22-services-gratuits-paiement-droits.md) |
| 23 | [Photos, justificatifs, exports](etape-23-photos-justificatifs-exports.md) |
| 24 | [Indicateurs](etape-24-indicateurs-tableau-de-bord.md) |
| 25 | [Confidentialité, export, fermeture, conservation](etape-25-confidentialite-export-fermeture.md) |
| 26 | [PWA, réseau faible, accessibilité, performance](etape-26-pwa-reseau-accessibilite-performance.md) |
| 27 | [Déploiement, sauvegarde, restauration, pilote](etape-27-deploiement-sauvegarde-pilote.md) |

Règle : ne pas commencer l’étape N+1 tant que la recette de N n’est pas fournie.

## Critères de fin et tests manuels

Chaque fichier d’étape contient :

1. un **tableau de tests manuels** (`NN-A`, `NN-B`, …) — actions exactes, résultat attendu ;
2. une section **Critères de fin** qui reprend **chaque ID de test** (cases à cocher), puis les livrables / règles, les tests automatisés et le compte rendu de recette.

Une étape n’est close que si toutes les cases sont cochées et l’anomalie bloquante absente. Toujours se référer au [CDC](../../CDC.md) et au [plan §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

| Étape | IDs manuels | Étape | IDs manuels |
| --- | --- | --- | --- |
| 01 | 01-A → 01-C | 15 | 15-A → 15-K |
| 02 | 02-A → 02-E | 16 | 16-A → 16-L |
| 03 | 03-A → 03-E | 17 | 17-A → 17-I |
| 04 | 04-A → 04-E | 18 | 18-A → 18-J |
| 05 | 05-A → 05-E | 19 | 19-A → 19-H (in-app, pas de FCM) |
| 06 | 06-A → 06-E | 20 | 20-A → 20-H |
| 07 | 07-A → 07-E | 21 | 21-A → 21-G |
| 08 | 08-A → 08-F | 22 | 22-A → 22-K |
| 09 | 09-A → 09-H | 23 | 23-A → 23-G |
| 10 | 10-A → 10-G | 24 | 24-A → 24-D |
| 11 | 11-A → 11-H | 25 | 25-A → 25-G |
| 12 | 12-A → 12-L | 26 | 26-A → 26-F |
| 13 | 13-A → 13-G | 27 | 27-A → 27-H |
| 14 | 14-A → 14-F | | |
