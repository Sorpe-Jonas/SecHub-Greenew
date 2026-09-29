"use client";

import { useActionState } from "react";

import { type LeadFormState, createLeadMeetingAction } from "@/app/actions/lead-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: LeadFormState = {};

type LeadMeetingFormProps = {
  leadId: string;
  meetingHtmlLink: string | null;
};

export function LeadMeetingForm({ leadId, meetingHtmlLink }: LeadMeetingFormProps) {
  const [state, action] = useActionState(createLeadMeetingAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="leadId" value={leadId} />
      <label>
        Data e hora da reuniao
        <input name="dateTime" type="datetime-local" required />
      </label>
      <label>
        Duracao
        <select className="selectInput" name="durationMin" defaultValue="30">
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="60">60 minutos</option>
        </select>
      </label>
      <label>
        Titulo (opcional)
        <input name="summary" type="text" placeholder="Reuniao SecHub" />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      {state.success ? <p className="successText">{state.success}</p> : null}
      <SubmitButton idleLabel="Agendar e enviar convite" pendingLabel="Agendando..." />
      {meetingHtmlLink ? (
        <p className="helperText">
          Reuniao agendada.{" "}
          <a href={meetingHtmlLink} target="_blank" rel="noreferrer">
            Abrir no Google Calendar
          </a>
        </p>
      ) : null}
    </form>
  );
}
