# Icônes BoulotFlash — Tabler Icons

| | |
| --- | --- |
| Catalogue | [https://tabler.io/icons](https://tabler.io/icons) |
| Package app | `@tabler/icons-react` |
| Style | Outline, taille 24, stroke 2, `currentColor` |

## Règles

1. Une seule source UI : Tabler. Pas d’autre set d’icônes génériques (Heroicons, Lucide, etc.).
2. **Exception OAuth** : les boutons « Continuer avec… » utilisent les **logos officiels des providers** dans `design/brand/oauth/` (couleurs de marque), pas des monochromes Tabler. En React : importer ces SVG (ou un wrapper `OAuthProviderIcon`) dans `leftSection` du bouton Mantine.
3. Nommer via le composant React (`IconSearch`), pas via une classe CSS inventée.
4. Dans Mantine : `leftSection={<IconSearch size={20} stroke={2} />}` ou `ActionIcon` avec une seule icône + `aria-label`.
5. Décoratif → `aria-hidden`. Action seule → label accessible.
6. Le picto marque (éclair BoulotFlash) reste `design/logo/boulotflash-mark.svg`, pas un substitut Tabler.

## Logos OAuth (providers)

| Bouton | Fichier | Notes |
| --- | --- | --- |
| Continuer avec Google | [`../brand/oauth/google.svg`](../brand/oauth/google.svg) | « G » multicolore officiel |
| Continuer avec Facebook | [`../brand/oauth/facebook.svg`](../brand/oauth/facebook.svg) | « f » `#1877F2` |
| Continuer avec Instagram | [`../brand/oauth/instagram.svg`](../brand/oauth/instagram.svg) | glyphe dégradé Meta |

Règles UI : logo 20–24 px à gauche, libellé centré ou à droite du logo, fond blanc, bordure soft, hauteur ≥ 44 px. Le logo BoulotFlash n’est jamais le CTA.

## Mapping métier (noms Tabler)

| Usage BoulotFlash | Icône Tabler | Export React |
| --- | --- | --- |
| Recherche | search | `IconSearch` |
| Localisation / commune | map-pin | `IconMapPin` |
| Menu hamburger | menu-2 | `IconMenu2` |
| Publier / offre | briefcase | `IconBriefcase` |
| Candidat / profil | user | `IconUser` |
| Connexion | login | `IconLogin` |
| Notification | bell | `IconBell` |
| Partager | share | `IconShare` |
| Signaler | flag | `IconFlag` |
| WhatsApp (lien) | brand-whatsapp | `IconBrandWhatsapp` |
| Téléphone | phone | `IconPhone` |
| Succès / confirmé | circle-check | `IconCircleCheck` |
| Attente | clock | `IconClock` |
| Refus / erreur | circle-x | `IconCircleX` |
| Alerte | alert-triangle | `IconAlertTriangle` |
| Coupure réseau | wifi-off | `IconWifiOff` |
| Catégorie vente | shopping-bag | `IconShoppingBag` |
| Catégorie service | tools-kitchen-2 | `IconToolsKitchen2` |
| Déménagement | truck | `IconTruck` |
| Ménage | home | `IconHome` |
| Inventaire | clipboard-list | `IconClipboardList` |
| Électricité | bolt | `IconBolt` |
| Distance / carte | route | `IconRoute` |
| Fermer | x | `IconX` |
| Retour | arrow-left | `IconArrowLeft` |
| Admin | shield-lock | `IconShieldLock` |
| Paramètres | settings | `IconSettings` |
| Photo / avatar | camera | `IconCamera` |
| Filtrer | filter | `IconFilter` |
| Liste vide | folder-off | `IconFolderOff` |

Si un besoin n’est pas dans ce tableau : chercher d’abord sur [tabler.io/icons](https://tabler.io/icons), puis ajouter une ligne ici avant d’utiliser l’icône dans le code.
