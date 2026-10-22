import tokensJson from '../../../../design/tokens/tokens.json';
import { STATUS_COLORS, BRAND_FLASH, SURFACE_CANVAS } from '@boulotflash/contracts';

export const tokens = tokensJson;

/** Couleurs de statut exposées au thème Mantine (doivent = tokens.json). */
export const mantineStatusColors = {
  attente: STATUS_COLORS.attente,
  succes: STATUS_COLORS.succes,
  refus: STATUS_COLORS.refus,
  alerte: STATUS_COLORS.alerte,
} as const;

/** Variables CSS / Tailwind générées depuis la même source. */
export const tailwindStatusColors = {
  '--color-status-attente-fg': STATUS_COLORS.attente.fg,
  '--color-status-attente-bg': STATUS_COLORS.attente.bg,
  '--color-status-succes-fg': STATUS_COLORS.succes.fg,
  '--color-status-succes-bg': STATUS_COLORS.succes.bg,
  '--color-status-refus-fg': STATUS_COLORS.refus.fg,
  '--color-status-refus-bg': STATUS_COLORS.refus.bg,
  '--color-status-alerte-fg': STATUS_COLORS.alerte.fg,
  '--color-status-alerte-bg': STATUS_COLORS.alerte.bg,
  '--color-brand-flash': BRAND_FLASH,
  '--color-surface-canvas': SURFACE_CANVAS,
} as const;

export function assertStatusColorsMatchTokens(): void {
  const fromJson = tokensJson.color.status;
  for (const key of Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]) {
    if (fromJson[key].fg !== STATUS_COLORS[key].fg) {
      throw new Error(`status.${key}.fg diverge: contracts vs tokens.json`);
    }
    if (fromJson[key].bg !== STATUS_COLORS[key].bg) {
      throw new Error(`status.${key}.bg diverge: contracts vs tokens.json`);
    }
    if (mantineStatusColors[key].fg !== fromJson[key].fg) {
      throw new Error(`status.${key}.fg diverge: mantine vs tokens.json`);
    }
    if (tailwindStatusColors[`--color-status-${key}-fg` as keyof typeof tailwindStatusColors] !== fromJson[key].fg) {
      throw new Error(`status.${key}.fg diverge: tailwind vs tokens.json`);
    }
  }
  if (tokensJson.color.brand.flash !== BRAND_FLASH) {
    throw new Error('brand.flash diverge');
  }
}
