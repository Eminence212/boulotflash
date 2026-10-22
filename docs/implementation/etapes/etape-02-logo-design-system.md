<!-- Document unique — ne pas fusionner avec d'autres étapes -->

|                       |                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Étape                 | 02 — Logo et design system                                                                     |
| Normatif produit      | [CDC.md](../../CDC.md)                                                                         |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9                    |
| Index des étapes      | [README.md](README.md)                                                                         |
| Précédente            | [etape-01-cadrage-decisions-jeux-de-donnees.md](etape-01-cadrage-decisions-jeux-de-donnees.md) |
| Suivante              | [etape-03-maquettes-mobiles.md](etape-03-maquettes-mobiles.md)                                 |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 02 — Logo vectoriel et design system partagé

**Objectif et résultat visible**

Un logo SVG inspiré de FLASH TRANSPORT (éclair, swoosh, bleu électrique), des dérivés PWA, des jetons alignés sur les captures soft UI, une page de référence **responsive** (360 → desktop), et l’inventaire des composants Mantine + Tailwind réutilisables. Mantine/Tailwind ne sont pas encore branchés à l’app : `tokens.json` est la source unique.

**Exigences couvertes**

CDC §12.5, §12.6, §12.7, §21. Livrable logo de la section 19.

**Prérequis et dépendances**

Étape 01. Pas d’application Next. Captures UI : [`captures/`](../../../captures/). Inspiration logo : [`design/logo/inspiration-flash-transport.png`](../../../design/logo/inspiration-flash-transport.png) (alias de `source-preview.png`) et [`source-on-dark.png`](../../../design/logo/source-on-dark.png).

**Travaux à réaliser, dans l’ordre**

1. [`design/logo/boulotflash.svg`](../../../design/logo/boulotflash.svg), [`boulotflash-mono.svg`](../../../design/logo/boulotflash-mono.svg), [`boulotflash-mark.svg`](../../../design/logo/boulotflash-mark.svg), favicon SVG.
2. PNG 192 et 512 dans [`design/logo/`](../../../design/logo/). Le SVG reste la source.
3. [`design/tokens/tokens.json`](../../../design/tokens/tokens.json) : Flash `#3EA4FF` (logo adopté), canvas `#F0F5FA`, typo Sora + Plus Jakarta Sans, rayons pills/cartes, touche 44, breakpoints. Statuts : attente, succès, refus, alerte. Montant / heure / commune lisibles sans couleur de statut.
4. [`design/DESIGN.md`](../../../design/DESIGN.md) + [`design/components/INVENTORY.md`](../../../design/components/INVENTORY.md) + [`design/components/ICONS.md`](../../../design/components/ICONS.md) (Mantine + Tailwind + [Tabler Icons](https://tabler.io/icons)).
5. [`design/reference/index.html`](../../../design/reference/index.html) autonome et **fluide** : logo clair/sombre, hero recherche (captures), chips, catégories avec icônes Tabler, bouton « Postuler », OAuth, badges, état vide, bandeau « non envoyé ». Charge les hex depuis `tokens.json`.
6. Le logo n’est pas un bouton. Les boutons sont des mots. Vouvoiement. Accroche « Trouvez un travail aujourd’hui. »

**Règles techniques et métier**

Ne pas introduire de note en étoiles ni de badge « fiable ». Les badges décrivent un contrôle. Cette page n’appelle aucune API. En app (étape 04+) : Mantine + Tailwind + `@tabler/icons-react` uniquement (pas Heroicons / Lucide / emoji UI).

**Tests manuels après cette étape**

| ID   | Scénario et objectif                    | Compte et préconditions | Actions exactes                                               | Résultat attendu                                 | Vérification complémentaire    |
| ---- | --------------------------------------- | ----------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| 02-A | Logo sur les deux fonds                 | Fichiers SVG            | Ouvrir [design/reference/index.html](../../../design/reference/index.html). Tester 360 puis élargir | BoulotFlash lisible clair et sombre                 | Picto éclair distinct à ~24 px |
| 02-B | Cibles tactiles                         | Page de référence       | Inspecter Postuler / Rechercher                               | Hauteur ≥ 44 px                                  | Logo non utilisé comme CTA     |
| 02-C | Statuts non portés par la seule couleur | Carte fictive           | Lire montant, heure, commune                                  | Texte présent                                    | Quatre badges de statut nommés |
| 02-D | Source unique                           | tokens.json             | Comparer swatches HTML et JSON                                | Hex issus du JSON (fetch)                        | Pas de seconde palette         |
| 02-E | Responsive                              | Page de référence       | 360, 430, 768, 1024 (comme [captures/](../../../captures/))                       | Hero et grilles se réorganisent sans débordement | Nav desktop dès ~1024          |

**Tests automatisés nécessaires**

Aucun avant l’outillage de l’étape 04. À l’étape 04 : égalité des couleurs de statut entre `tokens.json`, thème Mantine et Tailwind.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `02-A` — Logo sur les deux fonds
- [ ] `02-B` — Cibles tactiles
- [ ] `02-C` — Statuts non portés par la seule couleur
- [ ] `02-D` — Source unique
- [ ] `02-E` — Responsive

**Livrables et règles**
- [ ] SVG, monochrome, mark, favicon, 192, 512.
- [ ] Page responsive montrant les composants de la section 12.7.
- [ ] Inventaire composants Mantine + Tailwind.
- [ ] Pas de style d’écran inventé hors de ces jetons.
- [ ] Logos OAuth providers présents dans `design/brand/oauth/` et affichés sur la page de référence.
- [ ] Icônes UI = Tabler uniquement ([ICONS.md](../../../design/components/ICONS.md)).
- [ ] Bleu marque `#3EA4FF` aligné logo adopté / [tokens.json](../../../design/tokens/tokens.json).
- [ ] Aucun test automatisé requis à cette étape (voir section Tests automatisés).
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : deux palettes divergentes, ou un badge qui promet un paiement.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 02 : logo, jetons, inventaire composants et page de référence dans `design/`. N’initialise pas Next.js et ne commence pas les maquettes d’écrans. Fournis la recette 02-A à 02-E.
