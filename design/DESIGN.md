# Design system BoulotFlash

| | |
| --- | --- |
| Source de vérité | [`tokens/tokens.json`](tokens/tokens.json) |
| Inspiration logo | Lockup adopté dans `logo/boulotflash.svg` — squircle + éclair `#3EA4FF` |
| Inspiration UI | [`captures/`](../captures/) — soft UI clair, pills, cartes très arrondies |
| Stack UI | **Mantine UI** (composants) + **Tailwind CSS** (layout / responsive) |
| Icônes | **[Tabler Icons](https://tabler.io/icons)** — `@tabler/icons-react` |
| Page de référence | [`reference/index.html`](reference/index.html) |
| Maquettes mobiles | [`maquettes/`](maquettes/) — 14 écrans MVP à 360 px (étape 03) |

## Direction visuelle

BoulotFlash combine l’énergie **Flash** (éclair, vitesse, bleu marque `#3EA4FF` issu du logo adopté) avec l’interface **douce et claire** des captures : fond pastel `#F0F5FA`, cartes blanches `radius 1.5–2rem`, boutons pills, chips soft, hero recherche.

- Mode clair par défaut (comme les captures). Le logo a une variante sombre pour favicon / PWA / fond inverse.
- Pas de palette violette générique, pas de crème + terracotta.
- Mobile-first (360 px), fluide jusqu’au desktop (1440 px).

## Logo

| Fichier | Usage |
| --- | --- |
| `logo/boulotflash.svg` | Principal (clair) — Boulot encre, Flash `#3EA4FF` |
| `logo/boulotflash-on-dark.svg` | Sur fond sombre — Boulot blanc, Flash bleu |
| `logo/boulotflash-mono.svg` | Monochrome (`currentColor`) |
| `logo/boulotflash-mark.svg` | Picto squircle + éclair |
| `logo/favicon.svg` | Favicon |
| `logo/boulotflash-192.png` / `512.png` | Icônes PWA |

Lockup adopté : marque (squircle bleu + éclair blanc) + **Boulot** + **Flash** italique + double swoosh sous « Flash » uniquement. Le SVG est la source ; les PNG PWA en dérivent.

Règles : le logo **n’est jamais** un bouton d’action. Les CTA restent des mots (Postuler, Publier, Accepter). Reconnaissable à 24 px.

## Jetons → Mantine + Tailwind

Une seule source. À l’étape 04 :

1. `tokens.json` → thème Mantine (`createTheme`) : `primaryColor`, `colors.flash`, `radius`, `fontFamily`, `defaultRadius`.
2. `tokens.json` → `tailwind.config` / CSS variables `:root` pour `bg-canvas`, `text-ink`, `rounded-card`, etc.
3. Test automatisé : égalité hex des couleurs de statut entre JSON, thème et Tailwind.

## Icônes — Tabler Icons

Bibliothèque unique : [tabler.io/icons](https://tabler.io/icons) (MIT, outline 24×24, stroke 2).

| Contexte | Package / usage |
| --- | --- |
| App Next.js | `@tabler/icons-react` (ex. `IconSearch`, `IconBriefcase`) |
| Page de référence HTML | webfont / SVG Tabler CDN |
| Mapping métier | [`components/ICONS.md`](components/ICONS.md) |

Interdit : Heroicons, Lucide, Font Awesome, Material Icons, emoji comme pictogramme UI. Le logo BoulotFlash (éclair) reste un asset SVG de marque, pas une icône Tabler.

**OAuth** : logos officiels Google / Facebook / Instagram dans [`brand/oauth/`](brand/oauth/) sur les boutons « Continuer avec… » (pas le monochrome Tabler, pas le logo BoulotFlash).

## Composants réutilisables

Tout écran compose ces briques. Pas de style one-off. Inventaire : [`components/INVENTORY.md`](components/INVENTORY.md).

Principe : chaque composant = wrapper Mantine + icône Tabler + classes Tailwind de layout. Props typées. Zéro couleur en dur hors jetons.

## Responsive

| Breakpoint | Usage |
| --- | --- |
| 360–479 | Mobile : colonne unique, bottom actions 44 px |
| 480–767 | Grand téléphone |
| 768–1023 | Tablette : hero 2 colonnes optionnel, grille catégories 2 |
| 1024+ | Desktop : nav horizontale, hero 2 colonnes, grille 3–4 |

## Accessibilité

- Contraste texte ≥ 4.5:1 en plein soleil.
- Couleur principale = bleu du logo `#3EA4FF` (mot « Flash », éclair) : fonds des boutons pleins, bordures, indicateurs, icône de navigation active. Libellé sur fond plein : blanc (choix de marque ; contraste 2,6:1 au repos, 3,4:1 au survol `#2B8FE6`, sous le seuil de 4,5:1 — écart assumé). Textes bleus (liens, boutons à contour, légers ou textuels, libellé de navigation actif, contour de focus) : `brand.flashText` `#006ED1`, même teinte (208°, saturation 100 %), assombrie juste assez pour 4,5:1 sur blanc, sur `flashSoft` et sur le canevas. Source : `tokens.json` → thème Mantine (`variantColorResolver`, `cssVariablesResolver`).
- Cibles tactiles ≥ 44 px.
- Montant, heure, commune toujours en texte (pas seulement une couleur).
- `prefers-reduced-motion` respecté.
- Focus visible (`ring` = `brand.flash`).

## Ton

Vouvoiement. Français simple. Accroche : « Trouvez un travail aujourd’hui. »
