"use client";

import { FinancialDocumentType } from "@prisma/client";
import { useActionState } from "react";

import {
  saveFinancialReminderRuleAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { financialDocumentLabels } from "@/lib/financial";

const initialState: FinancialFormState = {};

export function FinancialReminderRuleForm(props: {
  rule?: {
    id: string;
    name: string;
    documentType: FinancialDocumentType | null;
    daysBeforeDue: number;
    frequencyDays: number;
    enabled: boolean;
    recipientEmails: string[];
    emailSubject: string | null;
    emailIntro: string | null;
  };
}) {
  const [state, action] = useActionState(saveFinancialReminderRuleAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      {props.rule ? <input type="hidden" name="ruleId" value={props.rule.id} /> : null}
      <label>
        Nome da regra
        <input name="name" type="text" defaultValue={props.rule?.name || ""} placeholder="Boleto padrao" />
      </label>
      <label>
        Tipo de documento
        <select className="selectInput" name="documentType" defaultValue={props.rule?.documentType || ""}>
          <option value="">Todos os tipos</option>
          {Object.values(FinancialDocumentType).map((type) => (
            <option key={type} value={type}>
              {financialDocumentLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Iniciar lembretes quantos dias antes
        <input name="daysBeforeDue" type="number" min="1" defaultValue={props.rule?.daysBeforeDue || 7} />
      </label>
      <label>
        Frequencia em dias
        <input name="frequencyDays" type="number" min="1" defaultValue={props.rule?.frequencyDays || 1} />
      </label>
      <label>
        Emails da regra
        <textarea
          className="textareaInput"
          name="recipientEmails"
          rows={3}
          defaultValue={props.rule?.recipientEmails.join(", ") || ""}
          placeholder="financeiro@cliente.com, gestor@cliente.com"
        />
      </label>
      <label>
        Assunto do email
        <input
          name="emailSubject"
          type="text"
          defaultValue={props.rule?.emailSubject || ""}
          placeholder="Cobranca SecHub - {{mes}}"
        />
      </label>
      <label>
        Introducao do email
        <textarea
          className="textareaInput"
          name="emailIntro"
          rows={4}
          defaultValue={props.rule?.emailIntro || ""}
          placeholder="Segue o resumo da cobranca e os documentos anexados."
        />
      </label>
      <label className="checkboxRow">
        <input name="enabled" type="checkbox" defaultChecked={props.rule?.enabled ?? true} />
        <span>Regra ativa</span>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      <SubmitButton idleLabel="Salvar regra" pendingLabel="Salvando..." />
    </form>
  );
}
