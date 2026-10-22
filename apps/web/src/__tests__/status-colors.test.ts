import tokensJson from '../../../../design/tokens/tokens.json';
import {
  STATUS_COLORS,
  BRAND_FLASH,
} from '@boulotflash/contracts';
import {
  mantineStatusColors,
  tailwindStatusColors,
  assertStatusColorsMatchTokens,
} from '../theme/tokens';

describe('égalité couleurs de statut', () => {
  it('aligne tokens.json, contracts, Mantine et Tailwind', () => {
    expect(() => assertStatusColorsMatchTokens()).not.toThrow();

    for (const key of ['attente', 'succes', 'refus', 'alerte'] as const) {
      expect(mantineStatusColors[key].fg).toBe(tokensJson.color.status[key].fg);
      expect(mantineStatusColors[key].bg).toBe(tokensJson.color.status[key].bg);
      expect(STATUS_COLORS[key].fg).toBe(tokensJson.color.status[key].fg);
      expect(
        tailwindStatusColors[`--color-status-${key}-fg` as keyof typeof tailwindStatusColors],
      ).toBe(tokensJson.color.status[key].fg);
      expect(
        tailwindStatusColors[`--color-status-${key}-bg` as keyof typeof tailwindStatusColors],
      ).toBe(tokensJson.color.status[key].bg);
    }

    expect(BRAND_FLASH).toBe('#3EA4FF');
    expect(tokensJson.color.brand.flash).toBe(BRAND_FLASH);
    expect(tailwindStatusColors['--color-brand-flash']).toBe(BRAND_FLASH);
  });
});
