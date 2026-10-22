<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 20 — Réalisation, absence, annulation, salaire, retours |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-19-rappels-in-app-horaires.md](etape-19-rappels-in-app-horaires.md) |
| Suivante | [etape-21-signalements-recours-files-admin.md](etape-21-signalements-recours-files-admin.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 20 — Réalisation, absence, annulation, salaire et retours privés

**Objectif et résultat visible**

Chaque partie déclare la réalisation, l’annulation ou l’absence. Le recruteur déclare avoir payé. Le candidat confirme ou conteste. Le retour privé n’apparaît pas sur le profil. Aucune note publique.

**Exigences couvertes**

BF-M-01 à BF-M-04, BF-SEL-05, §9.4, §9.5. Recettes 11 et 15. D07 et D20.

**Prérequis et dépendances**

Étapes 17, 18 et 19. `DISPUTE_WINDOW_HOURS` affiché, hypothèse 48.

**Travaux à réaliser, dans l’ordre**

1. Écran de la participation : trois déclarations, texte qui dit que BoulotFlash ne paie pas le salaire et ne tranche pas le litige.
2. Enregistrer la déclaration de chaque partie. Si elles divergent, `dispute_flag`.
3. Passage à `COMPLETED` seulement si une partie déclare la réalisation et que l’autre ne conteste pas avant la fin de la fenêtre. Le bouton « contester » dans la fenêtre bloque le passage automatique.
4. Absence contestable de la même façon.
5. Annulation par l’une ou l’autre : notification **in-app** (immédiate), contact révoqué, place libérée si D20, offre qui revient à `PUBLISHED` si elle était `FILLED` et que les candidatures sont encore ouvertes. Pas de push.
6. Déclaration de paiement du recruteur et confirmation du candidat. Deux champs. Pas de statut « payé par BoulotFlash ».
7. Retour privé, 500 caractères, visible par l’auteur et par support, modo, super. Absent du `GET` public de profil et de l’offre.
8. Un désaccord propose d’ouvrir un signalement, branché à l’étape 21. Ici, le bouton peut créer le report si la route minimale existe, sinon il mène à un écran qui sera relié. Pour éviter un trou : créer le report dans l’étape 21 seulement, et ici garder le `dispute_flag`.

**Règles techniques et métier**

La clôture des candidatures ne change pas les participations. Le montant affiché dans le litige est celui de `job_version_id`, pas celui de la fiche courante.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 20-A | Réalisation concordante | Participation confirmée | Les deux déclarent « réalisée » | Statut « Réalisée » après les deux déclarations, sans attendre si les deux sont d’accord | `dispute_flag` faux |
| 20-B | Fenêtre | Une seule déclaration « réalisée » | Avancer l’horloge de 47 heures | Pas encore terminée. Avancer à 49 heures | Passe à réalisée si pas de contestation |
| 20-C | Contestation | Dans la fenêtre, l’autre déclare une absence |  | `dispute_flag` vrai. Pas de passage silencieux à réalisée |  |
| 20-D | Salaire | Recruteur « j’ai payé ». Candidat « je n’ai pas reçu » |  | Désaccord enregistré. Texte « ceci n’est pas une preuve de paiement » | Aucune ligne `payments` commerciale créée |
| 20-E | Annulation | Participation confirmée | Le recruteur annule | Les deux ont une notification. Le contact répond 404 | Place non comptée dans les occupées |
| 20-F | Retour | Après réalisation | Chaque partie écrit un retour | Visible dans l’admin par `modo`. Invisible sur le profil public du candidat | Le JSON public n’a pas `rating` ni `comment` |
| 20-G | Version figée | Participation sur l’ancienne version, offre modifiée | Ouvrir le litige | Le montant affiché est l’ancien |  |
| 20-H | Note publique | Profil candidat | Lire la page | Aucune étoile, aucun score | La formule du CDC n’est pas calculée : pas de colonne remplie |

**Tests automatisés nécessaires**

Jest : accord, désaccord, fenêtre, révocation à l’annulation, absence de note dans le DTO public, place libérée.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `20-A` — Réalisation concordante
- [ ] `20-B` — Fenêtre
- [ ] `20-C` — Contestation
- [ ] `20-D` — Salaire
- [ ] `20-E` — Annulation
- [ ] `20-F` — Retour
- [ ] `20-G` — Version figée
- [ ] `20-H` — Note publique

**Livrables et règles**
- [ ] Recettes 11 et 15 sur le retour privé.
- [ ] Salaire hors plateforme.
- [ ] Délai affiché avant de déclarer.
- [ ] Tests automatisés exécutés avec succès : Jest déclarations, fenêtre litige, annulation, DTO sans note.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : note publique, ou contact encore lisible après annulation.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 20 : déclarations, salaire déclaré et retours privés. Le traitement des signalements est l’étape 21. Fournis la recette 20-A à 20-H.

