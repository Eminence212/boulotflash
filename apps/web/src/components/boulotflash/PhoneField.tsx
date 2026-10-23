'use client';

import { TextInput } from '@mantine/core';

const PHONE_HINT =
  'Format Kinshasa : +243 suivi de 9 chiffres. Modifiable si le numéro a changé ou a été perdu.';

type PhoneFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: React.ReactNode;
  required?: boolean;
};

/**
 * Champ téléphone profil — édition libre (perte / changement de numéro).
 * Validation côté API : +243 + 9 chiffres.
 */
export function PhoneField({
  value,
  onChange,
  error,
  required = true,
}: PhoneFieldProps) {
  return (
    <TextInput
      label="Téléphone"
      description={PHONE_HINT}
      placeholder="+243812345678"
      required={required}
      inputMode="tel"
      autoComplete="tel"
      value={value}
      error={error}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}

export function isValidPilotPhoneInput(raw: string): boolean {
  const v = raw.replace(/\s/g, '');
  return /^\+?243\d{9}$|^0\d{9}$|^\d{9}$/.test(v);
}
