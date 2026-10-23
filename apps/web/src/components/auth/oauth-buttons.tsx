'use client';

import { AppButton, type AppButtonProps } from '@/components/feedback';

type OAuthButtonProps = AppButtonProps;

function OAuthLogo({
  src,
  label,
}: {
  src: string;
  label: string;
}) {
  return (
    // Logos officiels providers (ICONS.md) — pas Tabler.
    <img
      src={src}
      alt=""
      width={18}
      height={18}
      aria-hidden
      data-oauth-logo={label}
      style={{ display: 'block' }}
    />
  );
}

export function GoogleButton(props: OAuthButtonProps) {
  return (
    <AppButton
      leftSection={<OAuthLogo src="/oauth/google.svg" label="google" />}
      variant="default"
      {...props}
    />
  );
}

export function FacebookButton(props: OAuthButtonProps) {
  return (
    <AppButton
      leftSection={<OAuthLogo src="/oauth/facebook.svg" label="facebook" />}
      variant="default"
      {...props}
    />
  );
}

export function GitHubButton(props: OAuthButtonProps) {
  return (
    <AppButton
      leftSection={<OAuthLogo src="/oauth/github.svg" label="github" />}
      variant="default"
      {...props}
    />
  );
}
