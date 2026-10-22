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
- [ ] `18-A` — Correspondance
- [ ] `18-B` — Pas de correspondance
- [ ] `18-C` — Auteur
- [ ] `18-D` — Doublon
- [ ] `18-E` — Profil incomplet
- [ ] `18-F` — Disponibilité coupée
- [ ] `18-G` — Créneau
- [ ] `18-H` — Autres événements
- [ ] `18-I` — Modification
- [ ] `18-J` — Texte

**Livrables et règles**
- [ ] Recette 20.
- [ ] Matrice in-app respectée pour les événements déjà possibles.
- [ ] Publication réussie même si le worker est arrêté, l’alerte partant à son retour.
- [ ] Tests automatisés exécutés avec succès : Jest filtre correspondance + unicité alerte in-app (zéro FCM).
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : un push ou un e-mail de correspondance, ou une seconde alerte pour la même offre.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 18 : centre in-app et correspondance dédupliquée. Ne configure pas Firebase. Fournis la recette 18-A à 18-J.
