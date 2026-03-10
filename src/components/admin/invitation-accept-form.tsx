"use client";

import { useActionState } from "react";

import { acceptInvitationAction, type AdminFormState } from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AdminFormState = {};

export function InvitationAcceptForm({
  token,
  email,
  companyName,
}: {
  token: string;
  email: string;
  companyName: string;
}) {
  const [state, action] = useActionState(acceptInvitationAction, initialState);

  return (
    <section className="authShell">
      <div className="authIntro">
        <span className="eyebrow">Convite</span>
        <h1>Ative seu acesso ao portal.</h1>
        <p>
          Voce foi convidado para a empresa {companyName}. Defina seu nome e senha para concluir o
          acesso com o email {email}.
        </p>
      </div>
      <div className="authCard">
        <form className="authForm" action={action}>
          <input type="hidden" name="token" value={token} />
          <label>
            Nome
            <input name="name" type="text" placeholder="Seu nome" />
          </label>
          <label>
            Senha
            <input name="password" type="password" placeholder="Minimo de 8 caracteres" />
          </label>
          {state.error ? <p className="errorText">{state.error}</p> : null}
          <SubmitButton idleLabel="Ativar conta" pendingLabel="Ativando..." />
        </form>
      </div>
    </section>
  );
}
