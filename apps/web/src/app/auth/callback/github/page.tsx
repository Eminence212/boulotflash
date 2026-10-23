import { Suspense } from 'react';
import { GlobalLoader } from '@/components/feedback';
import { OauthCallbackClient } from '@/components/auth/OauthCallbackClient';

export default function GithubCallbackPage() {
  return (
    <Suspense
      fallback={<GlobalLoader fullscreen message="Connexion GitHub…" />}
    >
      <OauthCallbackClient provider="github" />
    </Suspense>
  );
}
