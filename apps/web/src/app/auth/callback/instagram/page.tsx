import { Suspense } from 'react';
import { GlobalLoader } from '@/components/feedback';
import { OauthCallbackClient } from '@/components/auth/OauthCallbackClient';

export default function InstagramCallbackPage() {
  return (
    <Suspense
      fallback={<GlobalLoader fullscreen message="Connexion Instagram…" />}
    >
      <OauthCallbackClient provider="instagram" />
    </Suspense>
  );
}
