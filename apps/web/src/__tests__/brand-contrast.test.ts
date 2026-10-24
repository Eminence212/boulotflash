import tokensJson from '../../../../design/tokens/tokens.json';

/** Contraste WCAG entre deux couleurs hexadécimales. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('couleur principale = bleu du logo', () => {
  const brand = tokensJson.color.brand;
  const surface = tokensJson.color.surface;

  it('garde le bleu exact du logo pour les fonds pleins', () => {
    expect(brand.flash).toBe('#3EA4FF');
  });

  it('libellé blanc sur fond plein (choix de marque, contraste connu sous 4.5:1)', () => {
    expect(brand.onFlash).toBe('#FFFFFF');
    // Écart assumé et documenté (DESIGN.md) : ce test signale toute dérive supplémentaire.
    expect(contrast(brand.onFlash, brand.flash)).toBeGreaterThan(2.6);
    expect(contrast(brand.onFlash, brand.flashHover)).toBeGreaterThan(3.3);
  });

  it('textes bleus lisibles sur blanc, fond clair et canevas (≥ 4.5:1)', () => {
    for (const bg of [surface.card, brand.flashSoft, surface.canvas]) {
      expect(contrast(brand.flashText, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
