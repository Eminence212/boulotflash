<!-- Document unique — ne pas fusionner avec d'autres étapes -->

|                       |                                                                                  |
| --------------------- | -------------------------------------------------------------------------------- |
| Étape                 | 03 — Maquettes mobiles                                                           |
| Normatif produit      | [CDC.md](../../CDC.md)                                                           |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9      |
| Index des étapes      | [README.md](README.md)                                                           |
| Précédente            | [etape-02-logo-design-system.md](etape-02-logo-design-system.md)                 |
| Suivante              | [etape-04-socle-depot-docker-compose.md](etape-04-socle-depot-docker-compose.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 03 — Maquettes mobiles des écrans du MVP

**Objectif et résultat visible**

Quatorze maquettes statiques, 360 px, utilisant les composants de l’étape 02. Elles ne sont pas l’application.

**Exigences couvertes**

CDC §15, §12.5, §21. Principes 2 et 5 pour le contenu visible.

**Prérequis et dépendances**

Étape 02.

**Travaux à réaliser, dans l’ordre**

Créer `design/maquettes/` avec une page HTML par écran du CDC :

1. Accueil et liste.
2. Recherche et filtres.
3. Détail public avec Partager, sans adresse ni téléphone.
4. Inscription : boutons Continuer avec Google, Facebook et Instagram.
5. Profil candidat et disponibilités.
6. Mes candidatures.
7. Profil recruteur, état « Services gratuits », abonnement actif.
8. Création de mission.
9. Mes missions, Partager seulement si publiée.
10. Confirmation et coordonnées, boutons Appeler et WhatsApp.
11. Notifications, déclarations, signalement.
12. Offres commerciales : services gratuits, pas de demande de paiement.
13. Administration : files, sans note publique.
14. Aide et confidentialité, bandeau « texte non validé juridiquement ».

Le pouce atteint Postuler, Proposer une place, Accepter, Décliner, Partager, Signaler en bas d’écran.

**Règles techniques et métier**

La maquette 3 ne contient pas l’adresse du jeu de données. La maquette 10 la contient, avec la mention qu’elle n’existe qu’après acceptation. La maquette 12 ne montre pas de tarif tant que l’interrupteur est faux.

**Tests manuels après cette étape**

| ID   | Scénario et objectif     | Compte et préconditions | Actions exactes                     | Résultat attendu                                                        | Vérification complémentaire                             |
| ---- | ------------------------ | ----------------------- | ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| 03-A | Parcours lisible à 360   | Maquettes               | Ouvrir les 14 fichiers, largeur 360 | Aucun texte horizontalement coupé sur les boutons d’action              | Même typographie que la page de référence               |
| 03-B | Détail public sans privé | Maquette 3              | Lire toute la page                  | Montant, commune, repère, distance. Pas de numéro, pas d’adresse exacte | Le bouton Partager est un mot                           |
| 03-C | Écran de contact séparé  | Maquette 10             | La comparer à la maquette 3         | L’adresse n’apparaît que sur la 10                                      | WhatsApp est un bouton, pas un message prérempli envoyé |
| 03-D | Services gratuits        | Maquette 7 et 12        | Lire l’état commercial              | « Services gratuits » et abonnement actif. Pas de montant à payer       |                                                         |
| 03-E | Inscription OAuth        | Maquette 4              | Lire le premier écran               | Trois boutons Google, Facebook, Instagram                               | Pas de mot de passe public, pas de champ OTP            |

**Tests automatisés nécessaires**

Aucun.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `03-A` — Parcours lisible à 360
- [ ] `03-B` — Détail public sans privé
- [ ] `03-C` — Écran de contact séparé
- [ ] `03-D` — Services gratuits
- [ ] `03-E` — Inscription OAuth

**Livrables et règles**
- [ ] 14 fichiers, un par écran de la section 15.
- [ ] Aucune maquette n’invente un chat, une note publique ou un paiement candidat.
- [ ] Les textes juridiques sont marqués non validés.
- [ ] Aucun test automatisé requis à cette étape (voir section Tests automatisés).
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : adresse exacte sur la maquette de détail public.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 03 : maquettes statiques dans `design/maquettes/` à partir des jetons existants. Ne crée pas l’application Next.js. Fournis la recette 03-A à 03-E.
