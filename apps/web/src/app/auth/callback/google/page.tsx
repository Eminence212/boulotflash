import { Suspense } from 'react';
import { GlobalLoader } from '@/components/feedback';
import { OauthCallbackClient } from '@/components/auth/OauthCallbackClient';

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<GlobalLoader fullscreen message="Connexion Google…" />}>
      <OauthCallbackClient provider="google" />
    </Suspense>
  );
}
