"use client";

import { useActionState } from "react";

import {
  syncFinancialSchemaAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialSchemaSyncForm() {
  const [state, action] = useActionState(syncFinancialSchemaAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <p className="helperText">
        Use este botao para aplicar o schema pendente sem derrubar o site.
      </p>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      <SubmitButton idleLabel="Sincronizar schema agora" pendingLabel="Sincronizando..." />
    </form>
  );
}
