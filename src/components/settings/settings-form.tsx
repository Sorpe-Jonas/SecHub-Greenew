"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import type { SettingsFormState } from "@/app/actions/settings-actions";

const initialState: SettingsFormState = {};

type SettingsFormProps = {
  action: (
    state: SettingsFormState,
    formData: FormData,
  ) => Promise<SettingsFormState>;
  fields: React.ReactNode;
  submitLabel: string;
};

export function SettingsForm({ action, fields, submitLabel }: SettingsFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form className="ticketForm" action={formAction}>
      {fields}
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel={submitLabel} pendingLabel="Salvando..." />
    </form>
  );
}
