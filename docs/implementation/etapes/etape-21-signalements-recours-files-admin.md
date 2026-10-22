<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 21 — Signalements, recours, files admin |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-20-realisation-annulation-salaire-retours.md](etape-20-realisation-annulation-salaire-retours.md) |
| Suivante | [etape-22-services-gratuits-paiement-droits.md](etape-22-services-gratuits-paiement-droits.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 21 — Signalements, recours et files d’administration

**Objectif et résultat visible**

Un utilisateur signale une offre, un profil ou une participation. Le modérateur voit l’historique et tranche. La personne suspendue envoie un complément une fois.

**Exigences couvertes**

§5.8, §11, BF-AD-01, BF-AD-02, BF-AD-03, BF-M-03. Recette 15.

**Prérequis et dépendances**

Étapes 10 et 20.

**Travaux à réaliser, dans l’ordre**

1. Bouton Signaler sur l’offre, le profil et la participation. Motifs du CDC. L’auteur voit reçu, en cours, traité. Pas les notes internes.
2. File admin ordonnée : argent, harcèlement, danger, puis fausse offre, puis hors catégorie, puis rémunération et absence.
3. Décisions : aucune action, avertissement, masquage, rejet motivé, suspension, rétablissement, fermeture. Motif interne et message compréhensible.
4. Suspension de compte : historique lisible, actions métier refusées.
5. Recours : une ligne `report_appeals`. Un second envoi est refusé. Un autre admin peut traiter si le seed a deux modos ; sinon le super-admin traite, et l’écran le dit.
6. Masquer une offre = `SUSPENDED`. Elle disparaît de la liste et n’a pas de lien public.
7. Le retour privé reste dans le dossier du support, pas sur le profil.

**Règles techniques et métier**

Un signalement ne révèle pas les coordonnées au support. Le support voit les déclarations, la version acceptée, les heures de notification, pas l’adresse, sauf le super-admin par la route journalisée.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 21-A | Création | `C-COMPLET` sur `J-PUB-1` | Signaler « demande d’argent », texte « on me demande des frais » | État « reçu » pour le candidat | Ligne `reports` `OPEN`. Pas de note interne dans ce JSON |
| 21-B | File | `modo` | Ouvrir la file du matin | Le signalement est en tête si c’est le seul danger ou argent | L’offre, les déclarations et la version sont lisibles. L’adresse exacte ne l’est pas |
| 21-C | Suspension d’offre | `modo` | Masquer l’offre, motif « fraude présumée » | Absente de la liste. 404 public. Candidature refusée | Les parties ont une notification |
| 21-D | Suspension de compte | `modo` | Suspendre `C-A`, motif « test » | `C-A` voit le message et son historique. Postuler répond 403 |  |
| 21-E | Recours | `C-A` | Envoyer un complément. Le renvoyer | Le premier est accepté. Le second est refusé | Une seule ligne d’appel |
| 21-F | Autre admin | `super` | Clore le recours | Historique visible. Le candidat voit « traité » |  |
| 21-G | Utilisateur tiers | `C-B` | Lire le signalement de `C-COMPLET` | 404 |  |

**Tests automatisés nécessaires**

Jest : priorité de file, un seul recours, suspension qui bloque la candidature, absence de champ privé dans le DTO support.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `21-A` — Création
- [ ] `21-B` — File
- [ ] `21-C` — Suspension d’offre
- [ ] `21-D` — Suspension de compte
- [ ] `21-E` — Recours
- [ ] `21-F` — Autre admin
- [ ] `21-G` — Utilisateur tiers

**Livrables et règles**
- [ ] Recette 15.
- [ ] Recours unique.
- [ ] Coordonnées non ouvertes par le signalement.
- [ ] Tests automatisés exécutés avec succès : Jest files, recours unique, suspension, pas de privé.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : notes internes visibles par l’auteur, ou offre suspendue encore dans la recherche.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 21 : signalements, file et recours. Ne construis pas le rapprochement des paiements. Fournis la recette 21-A à 21-G.

