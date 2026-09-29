"use client";

import { useActionState } from "react";

import { type LeadFormState, disconnectGoogleCalendarAction } from "@/app/actions/lead-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: LeadFormState = {};

type GoogleConnectPanelProps = {
  configured: boolean;
  result?: string | null;
  connection: { googleEmail: string | null; calendarId: string } | null;
};

export function GoogleConnectPanel({ configured, result, connection }: GoogleConnectPanelProps) {
  const [state, action] = useActionState(disconnectGoogleCalendarAction, initialState);

  const resultMessage =
    result === "connected" ? (
      <p className="successText">Conta Google conectada com sucesso.</p>
    ) : result === "unconfigured" ? (
      <p className="errorText">Configure o Client ID e o Client Secret antes de conectar.</p>
    ) : result === "error" ? (
      <p className="errorText">Nao foi possivel conectar a conta Google. Tente novamente.</p>
    ) : null;

  if (!configured) {
    return (
      <>
        {resultMessage}
        <p className="helperText">
          O Google Calendar ainda nao esta configurado. Cadastre o Client ID e o Client Secret em
          Configuracoes para habilitar o agendamento de reunioes.
        </p>
      </>
    );
  }

  if (!connection) {
    return (
      <>
        {resultMessage}
        <p className="helperText">
          Conecte sua conta Google para criar reunioes e enviar o convite diretamente ao lead.
        </p>
        <a className="primaryButton" href="/api/integrations/google/connect">
          Conectar Google Calendar
        </a>
      </>
    );
  }

  return (
    <>
      {resultMessage}
      <p className="helperText">
        Conta conectada: <strong>{connection.googleEmail || "Google"}</strong> · Calendario:{" "}
        {connection.calendarId}
      </p>
      <form action={action}>
        {state.error ? <p className="errorText">{state.error}</p> : null}
        {state.success ? <p className="successText">{state.success}</p> : null}
        <SubmitButton idleLabel="Desconectar conta Google" pendingLabel="Desconectando..." />
      </form>
    </>
  );
}
