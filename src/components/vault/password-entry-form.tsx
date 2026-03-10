"use client";

import { useActionState } from "react";

import {
  createPasswordEntryAction,
  type PasswordFormState,
  updatePasswordEntryAction,
} from "@/app/actions/password-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: PasswordFormState = {};

type PasswordEntryFormProps = {
  mode: "create" | "edit";
  entry?: {
    id: string;
    title: string;
    username: string;
    url: string | null;
    notes: string | null;
    tags: string[];
  };
  initialPassword?: string;
};

export function PasswordEntryForm({ mode, entry, initialPassword }: PasswordEntryFormProps) {
  const actionFn = mode === "create" ? createPasswordEntryAction : updatePasswordEntryAction;
  const [state, action] = useActionState(actionFn, initialState);

  return (
    <form className="ticketForm" action={action}>
      {entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}
      <label>
        Titulo
        <input name="title" type="text" defaultValue={entry?.title || ""} placeholder="Ex.: VPN Produção" />
      </label>
      <label>
        Usuario
        <input name="username" type="text" defaultValue={entry?.username || ""} placeholder="usuario.sistema" />
      </label>
      <label>
        Senha
        <input
          name="password"
          type="text"
          defaultValue={initialPassword || ""}
          placeholder="Senha da credencial"
        />
      </label>
      <label>
        URL
        <input name="url" type="url" defaultValue={entry?.url || ""} placeholder="https://sistema.empresa.com" />
      </label>
      <label>
        Tags
        <input
          name="tags"
          type="text"
          defaultValue={entry?.tags.join(", ") || ""}
          placeholder="vpn, infraestrutura, producao"
        />
      </label>
      <label>
        Observacoes
        <textarea
          className="textareaInput"
          name="notes"
          rows={5}
          defaultValue={entry?.notes || ""}
          placeholder="Contexto da credencial, dono, instrucoes ou observacoes internas."
        />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton
        idleLabel={mode === "create" ? "Salvar credencial" : "Atualizar credencial"}
        pendingLabel={mode === "create" ? "Salvando..." : "Atualizando..."}
      />
    </form>
  );
}
