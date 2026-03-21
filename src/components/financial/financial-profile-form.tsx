"use client";

import { useActionState } from "react";

import {
  type FinancialFormState,
  saveFinancialProfileAction,
} from "@/app/actions/financial-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FinancialFormState = {};

type FinancialProfileFormProps = {
  profile?: {
    includedHours: string;
    hourlyRate: string;
    extraHourlyRate: string;
    extraHalfHourRate: string;
    visitRate: string;
    billingDay: number;
    contractStartDate: string;
  } | null;
  canEdit: boolean;
};

export function FinancialProfileForm({ profile, canEdit }: FinancialProfileFormProps) {
  const [state, action] = useActionState(saveFinancialProfileAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <label>
        Horas inclusas
        <input
          name="includedHours"
          type="text"
          defaultValue={profile?.includedHours || "10"}
          disabled={!canEdit}
        />
      </label>
      <label>
        Valor base mensal
        <input
          name="hourlyRate"
          type="text"
          defaultValue={profile?.hourlyRate || "0"}
          disabled={!canEdit}
        />
      </label>
      <label>
        Valor por hora excedente
        <input
          name="extraHourlyRate"
          type="text"
          defaultValue={profile?.extraHourlyRate || "0"}
          disabled={!canEdit}
        />
      </label>
      <label>
        Valor por meia hora excedente
        <input
          name="extraHalfHourRate"
          type="text"
          defaultValue={profile?.extraHalfHourRate || "0"}
          disabled={!canEdit}
        />
      </label>
      <label>
        Valor por visita
        <input
          name="visitRate"
          type="text"
          defaultValue={profile?.visitRate || "0"}
          disabled={!canEdit}
        />
      </label>
      <label>
        Dia de faturamento
        <input
          name="billingDay"
          type="number"
          min="1"
          max="28"
          defaultValue={profile?.billingDay || 5}
          disabled={!canEdit}
        />
      </label>
      <label>
        Data de assinatura do contrato
        <input
          name="contractStartDate"
          type="date"
          defaultValue={profile?.contractStartDate || ""}
          disabled={!canEdit}
        />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {canEdit ? <SubmitButton idleLabel="Salvar perfil" pendingLabel="Salvando..." /> : null}
    </form>
  );
}
