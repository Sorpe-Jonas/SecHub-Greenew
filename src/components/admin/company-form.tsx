"use client";

import { useActionState } from "react";

import { type AdminFormState, createCompanyAction } from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AdminFormState = {};

export function CompanyForm() {
  const [state, action] = useActionState(createCompanyAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <label>
        Nome da empresa
        <input name="name" type="text" placeholder="Nome da empresa" />
      </label>
      <label>
        Slug
        <input name="slug" type="text" placeholder="empresa-cliente" />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Criar empresa" pendingLabel="Criando..." />
    </form>
  );
}
