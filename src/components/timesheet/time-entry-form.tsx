"use client";

import { TimeEntryType } from "@prisma/client";
import { useActionState } from "react";

import {
  createManualTimeEntryAction,
  type TimeEntryFormState,
  updateTimeEntryAction,
} from "@/app/actions/timesheet-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: TimeEntryFormState = {};

type TimeEntryFormProps = {
  mode: "create" | "edit";
  ticketOptions: Array<{ id: string; title: string }>;
  entry?: {
    id: string;
    ticketId: string | null;
    description: string | null;
    entryType: TimeEntryType;
    startedAt: string;
    endedAt: string;
  };
};

export function TimeEntryForm({ mode, ticketOptions, entry }: TimeEntryFormProps) {
  const actionFn = mode === "create" ? createManualTimeEntryAction : updateTimeEntryAction;
  const [state, action] = useActionState(actionFn, initialState);

  return (
    <form className="ticketForm" action={action}>
      {entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}
      <label>
        Ticket opcional
        <select className="selectInput" name="ticketId" defaultValue={entry?.ticketId || ""}>
          <option value="">Sem ticket</option>
          {ticketOptions.map((ticket) => (
            <option key={ticket.id} value={ticket.id}>
              {ticket.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tipo
        <select className="selectInput" name="entryType" defaultValue={entry?.entryType || TimeEntryType.SUPPORT}>
          {Object.values(TimeEntryType).map((entryType) => (
            <option key={entryType} value={entryType}>
              {entryType}
            </option>
          ))}
        </select>
      </label>
      <label>
        Inicio
        <input name="startedAt" type="datetime-local" defaultValue={entry?.startedAt || ""} />
      </label>
      <label>
        Fim
        <input name="endedAt" type="datetime-local" defaultValue={entry?.endedAt || ""} />
      </label>
      <label>
        Descricao
        <textarea
          className="textareaInput"
          name="description"
          rows={4}
          defaultValue={entry?.description || ""}
          placeholder="Descreva o atendimento, contexto e resultado."
        />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton
        idleLabel={mode === "create" ? "Salvar lancamento" : "Atualizar lancamento"}
        pendingLabel={mode === "create" ? "Salvando..." : "Atualizando..."}
      />
    </form>
  );
}
