"use client";

import { useTransition } from "react";

type VaultQuickActionsProps = {
  entryId: string;
  username: string;
  url: string | null;
  canDelete: boolean;
};

async function copyToClipboard(value: string, successLabel: string) {
  if (!value) {
    return;
  }

  await navigator.clipboard.writeText(value);
  window.alert(successLabel);
}

export function VaultQuickActions({
  entryId,
  username,
  url,
  canDelete,
}: VaultQuickActionsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="quickActionRow">
      <button
        className="secondaryButton"
        type="button"
        onClick={() => {
          void copyToClipboard(username, "Usuario copiado.");
        }}
      >
        Copiar user
      </button>
      <button
        className="secondaryButton"
        type="button"
        onClick={() => {
          if (!url) {
            window.alert("Esta credencial nao possui URL.");
            return;
          }

          void copyToClipboard(url, "URL copiada.");
        }}
      >
        Copiar URL
      </button>
      <button
        className="secondaryButton"
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/vault/${entryId}/secret`, {
              method: "POST",
            });

            if (!response.ok) {
              window.alert("Nao foi possivel copiar a senha.");
              return;
            }

            const data = (await response.json()) as { password?: string | null };

            if (!data.password) {
              window.alert("Senha indisponivel.");
              return;
            }

            await copyToClipboard(data.password, "Senha copiada.");
          });
        }}
      >
        {isPending ? "Copiando..." : "Copiar senha"}
      </button>
      {canDelete ? (
        <form action={`/api/vault/${entryId}/delete`} method="post">
          <button className="dangerButton" type="submit">
            Deletar credencial
          </button>
        </form>
      ) : null}
    </div>
  );
}
