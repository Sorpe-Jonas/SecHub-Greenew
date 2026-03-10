"use client";

import { useActionState } from "react";

import {
  type FinancialFormState,
  updateFinancialDocumentStatusAction,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialDocumentStatusForm(props: {
  documentId: string;
  isPaid: boolean;
  reminderEnabled: boolean;
}) {
  const [state, action] = useActionState(updateFinancialDocumentStatusAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="documentId" value={props.documentId} />
      <label className="checkboxRow">
        <input name="markAsPaid" type="checkbox" defaultChecked={props.isPaid} />
        <span>Documento pago</span>
      </label>
      <label className="checkboxRow">
        <input name="reminderEnabled" type="checkbox" defaultChecked={props.reminderEnabled} />
        <span>Lembretes ativos</span>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Salvar documento" pendingLabel="Salvando..." />
    </form>
  );
}
