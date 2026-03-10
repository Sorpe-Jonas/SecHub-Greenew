"use client";

import { useFormStatus } from "react-dom";

import { addTicketMessageAction } from "@/app/actions/ticket-actions";

function ReplyButton() {
  const { pending } = useFormStatus();

  return (
    <button className="primaryButton" type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar resposta"}
    </button>
  );
}

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  return (
    <form className="ticketReplyForm" action={addTicketMessageAction}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <label>
        Nova resposta
        <textarea
          className="textareaInput"
          name="message"
          rows={5}
          placeholder="Adicione uma atualizacao, diagnostico ou resposta ao chamado."
        />
      </label>
      <label className="checkboxRow">
        <input name="isInternal" type="checkbox" />
        <span>Nota interna (nao notificar o cliente)</span>
      </label>
      <ReplyButton />
    </form>
  );
}
