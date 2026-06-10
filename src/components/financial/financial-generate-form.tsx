"use client";

import { useActionState } from "react";

import {
  generateFinancialStatementAction,
  type FinancialFormState,
} from "@/app/actions/financial-actions";
import { formatDecimalHoursToHMM } from "@/lib/financial";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

export function FinancialGenerateForm(props: {
  referenceDate: string;
  canEdit: boolean;
  includedHours: number;
  extraHours: number;
  currentVisits: number;
  cycleLabel: string;
}) {
  const [state, action] = useActionState(generateFinancialStatementAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <label>
        Data dentro do periodo
        <input name="referenceDate" type="date" defaultValue={props.referenceDate} disabled={!props.canEdit} />
      </label>
      <div className="detailList">
        <div>
          <strong>Competencia</strong>
          <span>{props.cycleLabel}</span>
        </div>
        <div>
          <strong>Franquia</strong>
          <span>{formatDecimalHoursToHMM(props.includedHours)}</span>
        </div>
        <div>
          <strong>Horas excedentes</strong>
          <span>{formatDecimalHoursToHMM(props.extraHours)}</span>
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
