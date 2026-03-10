"use client";

import { useActionState } from "react";

import {
  generateFinancialStatementAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialGenerateForm(props: {
  referenceMonth: string;
  canEdit: boolean;
  includedHours: number;
  extraHours: number;
  currentVisits: number;
}) {
  const [state, action] = useActionState(generateFinancialStatementAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <label>
        Mes de referencia
        <input name="referenceMonth" type="month" defaultValue={props.referenceMonth} disabled={!props.canEdit} />
      </label>
      <div className="detailList">
        <div>
          <strong>Franquia</strong>
          <span>{props.includedHours.toFixed(2)}h</span>
        </div>
        <div>
          <strong>Horas excedentes</strong>
          <span>{props.extraHours.toFixed(2)}h</span>
        </div>
        <div>
          <strong>Visitas</strong>
          <span>{props.currentVisits}</span>
        </div>
      </div>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      {props.canEdit ? (
        <SubmitButton idleLabel="Gerar fechamento" pendingLabel="Gerando..." />
      ) : (
        <p className="helperText">Somente o Admin Total pode gerar fechamentos.</p>
      )}
    </form>
  );
}
