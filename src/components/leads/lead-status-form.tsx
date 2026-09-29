"use client";

import { LeadStatus } from "@prisma/client";
import { useActionState } from "react";

import { type LeadFormState, updateLeadStatusAction } from "@/app/actions/lead-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { leadStatusLabels, leadStatusOrder } from "@/lib/leads";

const initialState: LeadFormState = {};

type LeadStatusFormProps = {
  leadId: string;
  status: LeadStatus;
};

export function LeadStatusForm({ leadId, status }: LeadStatusFormProps) {
  const [state, action] = useActionState(updateLeadStatusAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <label>
        Estado do cliente
        <select className="selectInput" name="status" defaultValue={status}>
          {leadStatusOrder.map((value) => (
            <option key={value} value={value}>
              {leadStatusLabels[value]}
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      <SubmitButton idleLabel="Salvar status" pendingLabel="Salvando..." />
    </form>
  );
}
