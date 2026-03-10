"use client";

import { useActionState } from "react";

import {
  addTicketAttachmentAction,
  type TicketFormState,
} from "@/app/actions/ticket-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: TicketFormState = {};

export function TicketAttachmentForm({ ticketId }: { ticketId: string }) {
  const [state, action] = useActionState(addTicketAttachmentAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <label>
        Nome do arquivo
        <input name="fileName" type="text" placeholder="print-erro.png" />
      </label>
      <label>
        Arquivo
        <input name="file" type="file" />
      </label>
      <label>
        Tipo MIME
        <input name="mimeType" type="text" placeholder="image/png" />
      </label>
      <label>
        Caminho ou URL alternativa
        <input name="storagePath" type="text" placeholder="https://..." />
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Adicionar anexo" pendingLabel="Anexando..." />
    </form>
  );
}
