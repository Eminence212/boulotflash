import {
  decryptTotpSecret,
  encodeTotpSecretForStorage,
  encryptTotpSecret,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode,
} from '../totp-crypto';

describe('totp-crypto', () => {
  const knownSecret = 'JBSWY3DPEHPK3PXP';
  const key = Buffer.alloc(32, 9);

  it('génère et vérifie un code TOTP (fenêtre ±1)', () => {
    const code = generateTotpCode(knownSecret);
    expect(verifyTotpCode(knownSecret, code)).toBe(true);
    expect(verifyTotpCode(knownSecret, '000000')).toBe(false);
  });

  it('chiffre / déchiffre AES-GCM', () => {
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret, key);
    expect(enc.startsWith('v1:')).toBe(true);
    const env = { TOTP_ENCRYPTION_KEY: key.toString('base64') };
    expect(decryptTotpSecret(enc, env)).toBe(secret);
  });

  it('encode seed-fixed sous TOTP_ADAPTER=fixed sans clé', () => {
    const enc = encodeTotpSecretForStorage(knownSecret, {
      TOTP_ADAPTER: 'fixed',
    });
    expect(decryptTotpSecret(enc, { TOTP_ADAPTER: 'fixed' })).toBe(knownSecret);
  });
});
