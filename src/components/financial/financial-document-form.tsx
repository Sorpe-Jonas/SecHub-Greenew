"use client";

import { FinancialDocumentType } from "@prisma/client";
import { useActionState } from "react";

import {
  addFinancialDocumentAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialDocumentForm({ statementId }: { statementId: string }) {
  const [state, action] = useActionState(addFinancialDocumentAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="statementId" value={statementId} />
      <label>
        Tipo do documento
        <select className="selectInput" name="documentType" defaultValue={FinancialDocumentType.BOLETO}>
          {Object.values(FinancialDocumentType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nome do arquivo
        <input name="fileName" type="text" placeholder="boleto-marco-2026.pdf" />
      </label>
      <label>
        Caminho ou URL
        <input name="storagePath" type="text" placeholder="/docs/boleto-marco-2026.pdf" />
      </label>
      <label className="checkboxRow">
        <input name="isAvailableToClient" type="checkbox" />
        <span>Disponibilizar para o cliente</span>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Anexar documento" pendingLabel="Anexando..." />
    </form>
  );
}
