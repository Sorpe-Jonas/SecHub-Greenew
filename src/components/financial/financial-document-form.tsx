"use client";

import { FinancialDocumentType } from "@prisma/client";
import { useActionState } from "react";

import {
  addFinancialDocumentAction,
  type FinancialFormState,
  updateFinancialDocumentAction,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { financialDocumentLabels } from "@/lib/financial";

const initialState: FinancialFormState = {};

type FinancialDocumentFormProps = {
  mode?: "create" | "edit";
  statementId?: string;
  statementOptions?: Array<{
    id: string;
    label: string;
  }>;
  document?: {
    id: string;
    statementId: string;
    documentType: FinancialDocumentType;
    fileName: string;
    storagePath: string;
    notes: string | null;
    dueDate: string;
    isAvailableToClient: boolean;
    reminderEnabled: boolean;
  };
};

export function FinancialDocumentForm({
  mode = "create",
  statementId,
  statementOptions = [],
  document,
}: FinancialDocumentFormProps) {
  const actionFn = mode === "edit" ? updateFinancialDocumentAction : addFinancialDocumentAction;
  const [state, action] = useActionState(actionFn, initialState);

  return (
    <form className="ticketForm" action={action}>
      {document ? <input type="hidden" name="documentId" value={document.id} /> : null}
      {statementId ? <input type="hidden" name="statementId" value={statementId} /> : null}
      {!statementId ? (
        <label>
          Fechamento vinculado
          <select className="selectInput" name="statementId" defaultValue={document?.statementId || ""}>
            <option value="">Selecione um fechamento</option>
            {statementOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Tipo do documento
        <select
          className="selectInput"
          name="documentType"
          defaultValue={document?.documentType || FinancialDocumentType.BOLETO}
        >
          {Object.values(FinancialDocumentType).map((type) => (
            <option key={type} value={type}>
              {financialDocumentLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nome do arquivo
        <input name="fileName" type="text" defaultValue={document?.fileName || ""} placeholder="boleto-marco-2026.pdf" />
      </label>
      <label>
        Arquivo
        <input name="file" type="file" />
      </label>
      <label>
        Caminho ou URL
        <input
          name="storagePath"
          type="text"
          defaultValue={document?.storagePath || ""}
          placeholder="/docs/boleto-marco-2026.pdf"
        />
      </label>
      <label>
        Observacoes
        <textarea
          className="textareaInput"
          name="notes"
          rows={3}
          defaultValue={document?.notes || ""}
          placeholder="Ex.: NFE referente ao contrato mensal."
        />
      </label>
      <label>
        Vencimento
        <input name="dueDate" type="date" defaultValue={document?.dueDate || ""} />
      </label>
      <label className="checkboxRow">
        <input name="isAvailableToClient" type="checkbox" defaultChecked={document?.isAvailableToClient} />
        <span>Disponibilizar para o cliente</span>
      </label>
      <label className="checkboxRow">
        <input
          name="reminderEnabled"
          type="checkbox"
          defaultChecked={document?.reminderEnabled ?? true}
        />
        <span>Enviar lembretes diarios ate o vencimento</span>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      <SubmitButton
        idleLabel={mode === "edit" ? "Salvar documento" : "Anexar documento"}
        pendingLabel={mode === "edit" ? "Salvando..." : "Anexando..."}
      />
    </form>
  );
}
