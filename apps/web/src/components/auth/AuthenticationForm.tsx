"use client";

import { useId } from "react";
import Link from "next/link";
import {
  Anchor,
  Checkbox,
  Divider,
  Paper,
  type PaperProps,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { AppAlert } from "@/components/feedback";
import { tokens } from "@/theme/tokens";
import { FacebookButton, GoogleButton, InstagramButton } from "./oauth-buttons";

export type AuthProvider = "google" | "facebook" | "instagram";

type AuthenticationFormProps = PaperProps & {
  onProvider: (provider: AuthProvider) => void;
  error?: string | null;
  message?: string | null;
  loading?: boolean;
};

/**
 * Connexion OAuth — consentement d’abord, puis choix du fournisseur.
 * Pas d’e-mail / mot de passe (D29).
 */
export function AuthenticationForm({
  onProvider,
  error,
  message,
  loading = false,
  ...paperProps
}: AuthenticationFormProps) {
  const hintId = useId();
  const form = useForm({
    initialValues: {
      ageConfirmed: false,
      acceptLegal: false,
    },
    validate: {
      ageConfirmed: (v) =>
        v ? null : "Confirmez que vous avez au moins 18 ans.",
      acceptLegal: (v) =>
        v
          ? null
          : "Acceptez les Conditions d’utilisation et la Politique de confidentialité.",
    },
  });

  const canContinue =
    form.values.ageConfirmed && form.values.acceptLegal && !loading;

  function tryProvider(provider: AuthProvider) {
    const result = form.validate();
    if (result.hasErrors) return;
    onProvider(provider);
  }

  const disabledReason =
    !form.values.ageConfirmed || !form.values.acceptLegal
      ? "Cochez les deux cases ci-dessus pour activer la connexion."
      : undefined;

  return (
    <Paper
      radius="md"
      p={{ base: "lg", sm: "xl" }}
      withBorder
      shadow="sm"
      style={{ borderColor: tokens.color.border.subtle }}
      {...paperProps}
    >
      <Stack gap="lg">
        <Stack gap={6}>
          <Title
            order={1}
            fz={{ base: 22, sm: 24 }}
            fw={800}
            style={{ fontFamily: "var(--font-display)", lineHeight: 1.25 }}
          >
            Connexion
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            Missions courtes — un compte Google, Facebook ou Instagram suffit.
            Pas de mot de passe ni de code SMS.
          </Text>
        </Stack>

        <Stack gap="sm" role="group" aria-labelledby={`${hintId}-consent`}>
          <Text
            id={`${hintId}-consent`}
            size="xs"
            tt="uppercase"
            fw={700}
            c="dimmed"
            lts={0.04}
          >
            Avant de continuer
          </Text>

          <Checkbox
            size="md"
            label="J’ai au moins 18 ans"
            checked={form.values.ageConfirmed}
            onChange={(event) => {
              form.setFieldValue("ageConfirmed", event.currentTarget.checked);
              form.clearFieldError("ageConfirmed");
            }}
            error={form.errors.ageConfirmed}
            styles={{
              body: { alignItems: "flex-start" },
              label: { paddingTop: 2, lineHeight: 1.45 },
              inner: { marginTop: 2 },
            }}
          />

          <Checkbox
            size="md"
            label={
              <Text size="sm" component="span" style={{ lineHeight: 1.45 }}>
                J’accepte les{" "}
                <Anchor
                  component={Link}
                  href="/conditions"
                  onClick={(e) => e.stopPropagation()}
                >
                  Conditions d’utilisation
                </Anchor>{" "}
                et la{" "}
                <Anchor
                  component={Link}
                  href="/confidentialite"
                  onClick={(e) => e.stopPropagation()}
                >
                  Politique de confidentialité
                </Anchor>
              </Text>
            }
            checked={form.values.acceptLegal}
            onChange={(event) => {
              form.setFieldValue("acceptLegal", event.currentTarget.checked);
              form.clearFieldError("acceptLegal");
            }}
            error={form.errors.acceptLegal}
            styles={{
              body: { alignItems: "flex-start" },
              label: { paddingTop: 2 },
              inner: { marginTop: 2 },
            }}
          />
        </Stack>

        {!canContinue && !loading ? (
          <AppAlert
            id={hintId}
            tone="info"
            title="Presque prêt"
          >
            Cochez les deux cases pour activer les boutons de connexion.
          </AppAlert>
        ) : null}

        <Divider label="Continuer avec" labelPosition="center" />

        <Stack gap="sm" aria-describedby={!canContinue ? hintId : undefined}>
          <GoogleButton
            radius="xl"
            size="md"
            fullWidth
            disabled={!canContinue}
            loading={loading}
            title={disabledReason}
            aria-disabled={!canContinue}
            onClick={() => tryProvider("google")}
            styles={
              canContinue
                ? {
                    root: {
                      borderColor: tokens.color.border.subtle,
                      fontWeight: 600,
                    },
                  }
                : undefined
            }
          >
            Google
          </GoogleButton>
          <FacebookButton
            radius="xl"
            size="md"
            fullWidth
            disabled={!canContinue}
            loading={loading}
            title={disabledReason}
            aria-disabled={!canContinue}
            onClick={() => tryProvider("facebook")}
            styles={
              canContinue
                ? {
                    root: {
                      borderColor: tokens.color.border.subtle,
                      fontWeight: 600,
                    },
                  }
                : undefined
            }
          >
            Facebook
          </FacebookButton>
          <InstagramButton
            radius="xl"
            size="md"
            fullWidth
            disabled={!canContinue}
            loading={loading}
            title={disabledReason}
            aria-disabled={!canContinue}
            onClick={() => tryProvider("instagram")}
            styles={
              canContinue
                ? {
                    root: {
                      borderColor: tokens.color.border.subtle,
                      fontWeight: 600,
                    },
                  }
                : undefined
            }
          >
            Instagram
          </InstagramButton>
        </Stack>

        {error ? (
          <AppAlert tone="error" title="Connexion">
            {error}
          </AppAlert>
        ) : null}
        {message ? (
          <AppAlert tone="info" title="Info">
            {message}
          </AppAlert>
        ) : null}
      </Stack>
    </Paper>
  );
}
