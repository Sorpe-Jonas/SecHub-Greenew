"use client";

import { TicketCategory, TicketPriority } from "@prisma/client";
import { useActionState } from "react";

import { createTicketAction, type TicketFormState } from "@/app/actions/ticket-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { getTicketCatalogItem, ticketPriorityLabels } from "@/lib/tickets";

const initialState: TicketFormState = {};

type TicketCreateFormProps = {
  category?: string;
  subcategory?: string;
};

export function TicketCreateForm({ category, subcategory }: TicketCreateFormProps) {
  const [state, action] = useActionState(createTicketAction, initialState);
  const categoryItem = getTicketCatalogItem(category);
  const isOther = category === TicketCategory.OTHER;

  return (
    <form className="ticketForm" action={action}>
      <input name="category" type="hidden" value={category || ""} />

      <label>
        Categoria
        <input value={categoryItem?.title || ""} readOnly />
      </label>

      <label>
        Subcategoria
        {isOther ? (
          <input name="subcategory" type="text" defaultValue={subcategory} placeholder="Descreva a subcategoria" />
        ) : (
          <input name="subcategory" type="text" defaultValue={subcategory} readOnly />
        )}
      </label>

      <label>
        Titulo
        <input
          name="title"
          type="text"
          placeholder={
            subcategory ? `Ex.: ${subcategory}` : "Descreva rapidamente o problema"
          }
        />
      </label>

      <label>
        Prioridade
        <select name="priority" defaultValue={TicketPriority.MEDIUM} className="selectInput">
          {Object.values(TicketPriority).map((priority) => (
            <option key={priority} value={priority}>
              {ticketPriorityLabels[priority]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Descricao
        <textarea
          className="textareaInput"
          name="description"
          placeholder="Detalhe o problema, impacto, urgencia e qualquer contexto util para o atendimento."
          rows={7}
        />
      </label>

      <label>
        Anexo inicial
        <input name="file" type="file" />
      </label>

      <label>
        URL/Caminho do anexo
        <input name="storagePath" type="text" placeholder="https://... ou /uploads/..." />
      </label>

      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Abrir ticket" pendingLabel="Criando ticket..." />
    </form>
  );
}
