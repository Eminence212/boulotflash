import { Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { OauthCallbackClient } from '@/components/auth/OauthCallbackClient';

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <Center mih="50dvh">
          <Loader color="flash" />
        </Center>
      }
    >
      <OauthCallbackClient provider="google" />
    </Suspense>
  );
}
