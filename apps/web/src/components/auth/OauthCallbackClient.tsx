'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { AppAlert } from '@/components/feedback';
import { apiFetch, saveAccessToken } from '@/lib/api';
import {
  clearPkce,
  readPkce,
  type AuthProvider,
} from '@/lib/oauth-pkce';

type OauthCallbackClientProps = {
  provider: AuthProvider;
};

export function OauthCallbackClient({ provider }: OauthCallbackClientProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const err = params.get('error');
      const errDesc = params.get('error_description');
      if (err) {
        setError(errDesc || err);
        return;
      }

      const code = params.get('code');
      const state = params.get('state');
      const pkce = readPkce();

      if (!code || !state || !pkce) {
        setError('Retour OAuth incomplet. Reprenez depuis la connexion.');
        return;
      }
      if (pkce.provider !== provider || pkce.state !== state) {
        setError('État OAuth invalide. Reprenez depuis la connexion.');
        return;
      }

      const { status, data } = await apiFetch<{
        accessToken?: string;
        needsProfileCompletion?: boolean;
        message?: string;
        code?: string;
      }>(`/auth/oauth/${provider}`, {
        method: 'POST',
        body: {
          code,
          codeVerifier: pkce.codeVerifier,
          ageConfirmed: pkce.ageConfirmed,
          acceptTerms: pkce.acceptTerms,
          acceptPrivacy: pkce.acceptPrivacy,
        },
      });

      if (cancelled) return;

      if (status >= 400 || !data.accessToken) {
        setError(data.message ?? `Connexion refusée (${data.code ?? status}).`);
        clearPkce();
        return;
      }

      saveAccessToken(data.accessToken);
      clearPkce();
      if (data.needsProfileCompletion) {
        router.replace('/profil/completer');
      } else {
        router.replace('/');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [params, provider, router]);

  if (error) {
    return (
      <Stack gap="md" maw={420} mx="auto" py="xl" px="md">
        <AppAlert tone="error" title="Connexion">
          {error}
        </AppAlert>
        <Text
          component="a"
          href="/connexion"
          size="sm"
          c="flash"
          style={{ textDecoration: 'underline' }}
        >
          Retour à la connexion
        </Text>
      </Stack>
    );
  }

  return (
    <Center mih="50dvh">
      <Stack align="center" gap="sm">
        <Loader color="flash" />
        <Text size="sm" c="dimmed">
          Connexion en cours…
        </Text>
      </Stack>
    </Center>
  );
}
