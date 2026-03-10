"use client";

import { TicketPriority, TicketStatus, UserRole } from "@prisma/client";
import { useActionState } from "react";

import {
  type TicketFormState,
  updateTicketManagementAction,
} from "@/app/actions/ticket-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { ticketPriorityLabels, ticketStatusLabels } from "@/lib/tickets";

const initialState: TicketFormState = {};

export function TicketManagementForm(props: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedToId: string | null;
  assignableUsers: Array<{ id: string; name: string | null; email: string; role: UserRole }>;
}) {
  const [state, action] = useActionState(updateTicketManagementAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="ticketId" value={props.ticketId} />
      <label>
        Status
        <select className="selectInput" name="status" defaultValue={props.status}>
          {Object.values(TicketStatus).map((status) => (
            <option key={status} value={status}>
              {ticketStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prioridade
        <select className="selectInput" name="priority" defaultValue={props.priority}>
          {Object.values(TicketPriority).map((priority) => (
            <option key={priority} value={priority}>
              {ticketPriorityLabels[priority]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Responsavel
        <select className="selectInput" name="assignedToId" defaultValue={props.assignedToId || ""}>
          <option value="">Nao atribuido</option>
          {props.assignableUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || item.email} ({item.role})
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Salvar ticket" pendingLabel="Salvando..." />
    </form>
  );
}
