import { createTheme, type MantineColorsTuple } from '@mantine/core';
import { tokens, mantineStatusColors } from './tokens';

function toTuple(hex: string): MantineColorsTuple {
  // Palette mono-teinte suffisante pour l'étape 04 (page minimale).
  return [
    hex, hex, hex, hex, hex, hex, hex, hex, hex, hex,
  ];
}

export const boulotflashTheme = createTheme({
  primaryColor: 'flash',
  colors: {
    flash: toTuple(tokens.color.brand.flash),
    attente: toTuple(mantineStatusColors.attente.fg),
    succes: toTuple(mantineStatusColors.succes.fg),
    refus: toTuple(mantineStatusColors.refus.fg),
    alerte: toTuple(mantineStatusColors.alerte.fg),
  },
  fontFamily: tokens.typography.fontFamily.body,
  fontFamilyMonospace: tokens.typography.fontFamily.mono,
  headings: {
    fontFamily: tokens.typography.fontFamily.display,
  },
  defaultRadius: 'xl',
  other: {
    status: mantineStatusColors,
    brandFlash: tokens.color.brand.flash,
    canvas: tokens.color.surface.canvas,
  },
});
