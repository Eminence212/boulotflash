import {
  createTheme,
  defaultVariantColorsResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';
import { tokens, mantineStatusColors } from './tokens';

function toTuple(hex: string): MantineColorsTuple {
  // Palette mono-teinte suffisante pour l'étape 04 (page minimale).
  return [
    hex, hex, hex, hex, hex, hex, hex, hex, hex, hex,
  ];
}

/**
 * Échelle Mantine ancrée sur les jetons de marque.
 * 1 = fond light, 2 = survol light/subtle, 6 = filled, 7 = survol filled, 9 = texte sur fond light.
 * Une teinte unique rend le survol illisible (texte et fond identiques).
 */
const flashColors: MantineColorsTuple = [
  '#F5FAFF',
  tokens.color.brand.flashSoft,
  '#D2E9FF',
  tokens.color.brand.flashMuted,
  '#85C4FF',
  '#60B4FF',
  tokens.color.brand.flash,
  tokens.color.brand.flashHover,
  tokens.color.brand.flashText,
  '#194A79',
];

const BRAND = tokens.color.brand;

/**
 * Couleur principale = bleu du logo #3EA4FF (mot « Flash », éclair).
 * - Fonds pleins : #3EA4FF, survol #2B8FE6, libellé blanc (choix de marque validé :
 *   2,6:1 au repos, 3,4:1 au survol, sous le seuil WCAG AA de 4,5:1 pour du texte courant).
 * - Libellés bleus (liens, boutons à contour, légers, textuels) : #006ED1, même teinte que le logo
 *   (208°, saturation 100 %), assombrie juste assez pour 4,5:1 sur blanc, sur le fond clair et sur le canevas.
 * - Bordures et indicateurs : #3EA4FF.
 */
function isBrand(color: string | undefined, primaryColor: string): boolean {
  return !color || color === 'flash' || color === primaryColor;
}

const brandVariantColors: VariantColorsResolver = (input) => {
  const fallback = defaultVariantColorsResolver(input);
  if (!isBrand(input.color, input.theme.primaryColor)) return fallback;
  switch (input.variant) {
    case 'filled':
      return {
        background: BRAND.flash,
        hover: BRAND.flashHover,
        color: BRAND.onFlash,
        border: '1px solid transparent',
      };
    case 'light':
      return { ...fallback, background: BRAND.flashSoft, hover: '#D2E9FF', color: BRAND.flashText };
    case 'outline':
      return {
        background: 'transparent',
        hover: BRAND.flashSoft,
        color: BRAND.flashText,
        border: `1px solid ${BRAND.flash}`,
      };
    case 'subtle':
    case 'transparent':
      return { ...fallback, hover: input.variant === 'subtle' ? BRAND.flashSoft : fallback.hover, color: BRAND.flashText };
    default:
      return fallback;
  }
};

/** Variables Mantine de la couleur principale : liens et textes d’accent en #006ED1, fonds en #3EA4FF. */
export const brandCssVariables: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-anchor': BRAND.flashText,
    '--mantine-color-flash-text': BRAND.flashText,
    '--mantine-color-flash-light-color': BRAND.flashText,
    '--mantine-color-flash-outline': BRAND.flash,
    '--mantine-color-flash-filled': BRAND.flash,
    '--mantine-color-flash-filled-hover': BRAND.flashHover,
    '--mantine-primary-color-filled': BRAND.flash,
    '--mantine-primary-color-filled-hover': BRAND.flashHover,
    '--mantine-primary-color-light-color': BRAND.flashText,
    '--mantine-primary-color-contrast': BRAND.onFlash,
  },
  dark: {},
});

/** Aligné sur ui.mantine.dev : Outfit (titres) + pile système Mantine (corps). */
const MANTINE_BODY =
  '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji';

export const boulotflashTheme = createTheme({
  primaryColor: 'flash',
  primaryShade: 6,
  variantColorResolver: brandVariantColors,
  colors: {
    flash: flashColors,
    attente: toTuple(mantineStatusColors.attente.fg),
    succes: toTuple(mantineStatusColors.succes.fg),
    refus: toTuple(mantineStatusColors.refus.fg),
    alerte: toTuple(mantineStatusColors.alerte.fg),
  },
  fontFamily: tokens.typography.fontFamily.body || MANTINE_BODY,
  fontFamilyMonospace: tokens.typography.fontFamily.mono,
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: '700',
    sizes: {
      h1: { fontWeight: '900' },
      h2: { fontWeight: '800' },
      h3: { fontWeight: '700' },
      h4: { fontWeight: '700' },
      h5: { fontWeight: '700' },
      h6: { fontWeight: '700' },
    },
  },
  defaultRadius: 'md',
  other: {
    status: mantineStatusColors,
    brandFlash: tokens.color.brand.flash,
    canvas: tokens.color.surface.canvas,
  },
});
