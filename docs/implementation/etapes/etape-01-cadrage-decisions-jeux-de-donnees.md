<!-- Document unique — ne pas fusionner avec d'autres étapes -->

|                       |                                                                             |
| --------------------- | --------------------------------------------------------------------------- |
| Étape                 | 01 — Cadrage, décisions et jeux de données                                  |
| Normatif produit      | [CDC.md](../../CDC.md)                                                      |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes      | [README.md](README.md)                                                      |
| Précédente            | —                                                                           |
| Suivante              | [etape-02-logo-design-system.md](etape-02-logo-design-system.md)            |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 01 — Cadrage, registre des décisions et jeux de données

**Objectif et résultat visible**

Un registre écrit distingue les décisions du CDC, les hypothèses et les points ouverts. Le jeu de données fictif est figé. Aucun écran applicatif.

**Exigences couvertes**

CDC §17 étape 1, §23, §24. Prépare toutes les `BF-*` sans en réaliser une.

**Prérequis et dépendances**

Le CDC version 1.2. Aucune dépendance logicielle.

**Travaux à réaliser, dans l’ordre**

1. Créer [REGISTRE_DECISIONS.md](../REGISTRE_DECISIONS.md) repris de la section 2 du plan, avec une colonne « tranché le » vide.
2. Recopier sans les modifier les hypothèses encore ouvertes : communes actives, D04, D07, D10, D14, D16, D17, D18, D19, D22, D23, D24, D25, D28.
3. Déposer [jeux-de-donnees.md](../jeux-de-donnees.md) comme source du futur seed. Ne pas coder le seed ici.
4. Noter l’appareil et le profil réseau de la recette 18, encore vides : modèle, version Android, Chrome, débit descendant, latence. Les remplir avant l’étape 26, pas maintenant.
5. Lister les 26 catégories et les 24 communes comme données à semer, communes inactives.

**Règles techniques et métier**

Aucune hypothèse de la section 23 du CDC n’est cochée « validée » dans le registre. Les communes pilotes restent non choisies.

**Tests manuels après cette étape**

| ID   | Scénario et objectif                                    | Compte et préconditions | Actions exactes                                                            | Résultat attendu                                                                                                     | Vérification complémentaire            |
| ---- | ------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 01-A | Le registre ne transforme pas une hypothèse en décision | Dépôt à jour            | Ouvrir [REGISTRE_DECISIONS.md](../REGISTRE_DECISIONS.md). Lire la ligne des communes et la ligne D10 | Les communes actives sont vides. D10 est « non validé »                                                              | Aucune commune n’est marquée pilote    |
| 01-B | Les comptes fictifs sont reproductibles                 | Jeu de données          | Compter les lignes du tableau des comptes                                  | 15 comptes, dont support, modo, finance, super, deux candidats de concurrence, un OAuth sans téléphone (`C-NOPHONE`) | Les téléphones présents sont en `+243` |
| 01-C | Le candidat ne paie pas dans le jeu                     | Jeu de données          | Chercher un prix candidat                                                  | Aucun frais candidat. `services_payants` est faux                                                                    |                                        |

**Tests automatisés nécessaires**

Aucun. Cette étape est documentaire.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `01-A` — Le registre ne transforme pas une hypothèse en décision
- [ ] `01-B` — Les comptes fictifs sont reproductibles
- [ ] `01-C` — Le candidat ne paie pas dans le jeu

**Livrables et règles**
- [ ] Le registre existe et les points ouverts sont vides de date de décision.
- [ ] Le jeu de données couvre les comptes demandés.
- [ ] On peut passer à l’étape 02 sans installer de dépendance.
- [ ] Aucun test automatisé requis à cette étape (voir section Tests automatisés).
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : une commune pilote cochée sans compte rendu d’entretiens, ou un prix de production présenté comme choisi.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 01 du plan BoulotFlash : le registre des décisions et la vérification du jeu de données déjà décrit. Ne crée pas de code applicatif, n’installe rien, ne commence pas l’étape 02. Fournis ensuite la recette manuelle 01-A à 01-C.
