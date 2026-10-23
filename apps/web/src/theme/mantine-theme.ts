import { createTheme, type MantineColorsTuple } from '@mantine/core';
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
  '#226CAF',
  '#194A79',
];

/** Aligné sur ui.mantine.dev : Outfit (titres) + pile système Mantine (corps). */
const MANTINE_BODY =
  '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji';

export const boulotflashTheme = createTheme({
  primaryColor: 'flash',
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
    fontFamily: tokens.typography.fontFamily.display,
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
