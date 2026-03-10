"use client";

import { FinancialStatementStatus } from "@prisma/client";
import { useActionState } from "react";

import {
  type FinancialFormState,
  updateFinancialStatementStatusAction,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialStatementStatusForm(props: {
  statementId: string;
  status: FinancialStatementStatus;
}) {
  const [state, action] = useActionState(updateFinancialStatementStatusAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="statementId" value={props.statementId} />
      <label>
        Status da cobranca
        <select className="selectInput" name="status" defaultValue={props.status}>
          {Object.values(FinancialStatementStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Atualizar status" pendingLabel="Salvando..." />
    </form>
  );
}
