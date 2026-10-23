'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlobalLoader } from '@/components/feedback';
import { useMe } from '@/hooks/useMe';
import { isEmployerMode } from '@/lib/me';

/** Redirige vers le profil du mode actif. */
export default function ProfilIndexPage() {
  const router = useRouter();
  const { me, loading } = useMe({ requireAuth: true });

  useEffect(() => {
    if (loading || !me) return;
    if (isEmployerMode(me)) {
      router.replace('/profil/recruteur');
    } else {
      router.replace('/profil/candidat');
    }
  }, [loading, me, router]);

  return <GlobalLoader fullscreen message="Ouverture du profil…" />;
}
