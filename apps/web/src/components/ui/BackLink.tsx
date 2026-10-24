'use client';

import Link from 'next/link';
import { Anchor } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

/** Lien de retour en tête de page : icône Tabler, cible tactile confortable. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Anchor
      component={Link}
      href={href}
      size="sm"
      fw={600}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        minHeight: 32,
      }}
    >
      <IconArrowLeft size={16} stroke={2} aria-hidden />
      {label}
    </Anchor>
  );
}
