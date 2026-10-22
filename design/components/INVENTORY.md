# Inventaire des composants réutilisables

Tous les écrans BoulotFlash composent ces briques. Stack obligatoire : **Mantine UI** + **Tailwind CSS** + **[Tabler Icons](https://tabler.io/icons)** (`@tabler/icons-react`). Aucun composant n’invente une couleur hors `tokens.json`. Mapping icônes : [`ICONS.md`](ICONS.md).

Chemin cible (étape 04+) : `apps/web/src/components/ui/` et `apps/web/src/components/boulotflash/`.

## Foundation (`components/ui`)

| Composant | Mantine de base | Tailwind (rôle) | Tokens |
| --- | --- | --- | --- |
| `AppShellLayout` | `AppShell` | `min-h-dvh`, gutters responsive | `layout.*` |
| `BrandLogo` | `Anchor` + SVG | `h-8 w-auto` / `h-6` mobile | logo SVG |
| `PrimaryButton` | `Button` `variant=filled` | `min-h-11 rounded-full` | `brand.flash`, `touch` |
| `SecondaryButton` | `Button` `variant=outline` | `min-h-11 rounded-full` | `brand.ink`, `border` |
| `GhostButton` | `Button` `variant=subtle` | `min-h-11` | |
| `TextField` | `TextInput` | `w-full` | `radius.md` |
| `PhoneField` | `TextInput` + masque | | `+243` |
| `SearchFieldGroup` | `Group` + `TextInput` ×2 + `ActionIcon` + `IconSearch` | `rounded-[2rem] shadow-md bg-white` | hero captures |
| `StatusBadge` | `Badge` | `rounded-full` | `status.*` + **libellé texte** |
| `SoftChip` | `Badge` / `Pill` | `bg-flash-soft text-flash` | popular searches |
| `EmptyState` | `Stack` + `Text` + CTA + icône Tabler | `py-16 text-center` | `IconFolderOff` |
| `OfflineBanner` | `Alert` + `IconWifiOff` | `sticky bottom` | « Non envoyé » |
| `SectionHeading` | `Title` + `Text` | `text-center max-w-xl mx-auto` | |
| `CategoryCard` | `UnstyledButton` / `Card` + icône Tabler | `rounded-2xl bg-flash-soft p-6` | voir `ICONS.md` |
| `PartnerRow` | `Group` | `grayscale opacity-60` | trust bar |
| `PageContainer` | `Container` | `px-5 md:px-8 max-w-6xl` | `layout.containerMax` |

## Métier (`components/boulotflash`)

| Composant | Rôle | Notes |
| --- | --- | --- |
| `JobCard` | Carte mission liste | Titre, montant **texte**, heure, commune, `StatusBadge`, distance |
| `JobDetailHeader` | En-tête offre | Pas de téléphone / adresse privée |
| `OAuthButtonGroup` | Google / Facebook / Instagram | Trois boutons avec logos `design/brand/oauth/*.svg` en `leftSection` ; case 18 ans à part |
| `ProfileCompleter` | Compléter mon profil | Champs manquants post-OAuth |
| `ModeSwitcher` | Candidat / Recruteur | Visible si les deux profils |
| `MapPreview` | Leaflet + distance km | Même jetons ; pas de style isolé |
| `ContactReveal` | Après acceptation | Téléphone + WhatsApp sans `text=` |
| `ProposalCard` | Proposition de place | Timer, Accepter / Décliner |
| `NotificationItem` | Centre in-app | |
| `AdminDataTable` | Tables admin | Mantine `Table` + Tailwind spacing |

## Règles d’implémentation

1. **Toujours** partir d’un composant Mantine (`Button`, `TextInput`, `Card`, `Badge`, `AppShell`, `Modal`, `Drawer`, `Tabs`, `Menu`, `Select`, `Checkbox`, `Switch`, `Alert`, `Loader`, `Skeleton`).
2. **Icônes uniquement Tabler** ([catalogue](https://tabler.io/icons)) via `@tabler/icons-react`. Pas d’emoji UI.
3. Tailwind pour : grille, flex, gaps, breakpoints (`sm:`, `md:`, `lg:`), largeurs max, sticky, safe-area.
4. Interdire `style={{ color: '#…' }}` et classes hex arbitraires hors variables CSS générées depuis les jetons.
5. Un composant = un fichier. Props documentées. Stories ou page `/design` (référence runtime) à l’étape 04.
6. Responsive : mobile d’abord ; tester 360, 430, 768, 1024, 1440 (captures fournies).

## Mapping captures → composants

| Zone capture | Composant BoulotFlash |
| --- | --- |
| Header logo + menu | `BrandLogo` + `AppShellLayout` |
| Hero « Find the perfect job » | `SectionHeading` + accroche FR |
| Barre recherche pill | `SearchFieldGroup` |
| Popular searches | `SoftChip` |
| Image + formes navy | Illustration hero (optionnelle, non bloquante MVP) |
| Category cards | `CategoryCard` |
| Partner logos | `PartnerRow` |
| Bouton Post a Job | `PrimaryButton` (« Publier ») |
| Sign in outline | `SecondaryButton` (« Connexion ») |
