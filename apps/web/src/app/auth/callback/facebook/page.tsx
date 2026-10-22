import { Suspense } from 'react';
import { GlobalLoader } from '@/components/feedback';
import { OauthCallbackClient } from '@/components/auth/OauthCallbackClient';

export default function FacebookCallbackPage() {
  return (
    <Suspense
      fallback={<GlobalLoader fullscreen message="Connexion Facebook…" />}
    >
      <OauthCallbackClient provider="facebook" />
    </Suspense>
  );
}
