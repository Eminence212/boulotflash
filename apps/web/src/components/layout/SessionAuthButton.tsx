"use client";

import type { MouseEventHandler } from "react";
import Link from "next/link";
import { Button } from "@mantine/core";

type SessionAuthAction = "login" | "logout";

type SessionAuthButtonProps = {
  action: SessionAuthAction;
  /** Cible du lien pour `action="login"` (défaut `/connexion`). */
  href?: string;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

/**
 * Bouton header session : Connexion (bleu Mantine, texte blanc) / Déconnexion (outline).
 */
export function SessionAuthButton({
  action,
  href = "/connexion",
  loading,
  onClick,
  disabled,
}: SessionAuthButtonProps) {
  const isLogin = action === "login";

  const visual = {
    size: "compact-md" as const,
    radius: "md" as const,
    fw: 600,
    loaderProps: { type: "dots" as const },
    styles: {
      root: {
        minHeight: 36,
        paddingInline: 12,
        flexShrink: 0,
      },
      label: {
        whiteSpace: "nowrap" as const,
      },
    },
    loading,
    disabled,
  };

  if (isLogin) {
    return (
      <Button
        component={Link}
        href={href}
        color="blue"
        variant="filled"
        c="white"
        {...visual}
      >
        Connexion
      </Button>
    );
  }

  return (
    <Button color="red" variant="outline" onClick={onClick} {...visual}>
      Déconnexion
    </Button>
  );
}
