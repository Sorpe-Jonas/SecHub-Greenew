"use client";

import { useActionState } from "react";

import {
  addFinancialRecipientAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialRecipientForm() {
  const [state, action] = useActionState(addFinancialRecipientAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <label>
        Email para cobranca
        <input name="email" type="email" placeholder="financeiro@cliente.com" />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Adicionar destinatario" pendingLabel="Salvando..." />
    </form>
  );
}
