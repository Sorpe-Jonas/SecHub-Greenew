"use client";

import { useTransition } from "react";

type Recipient = {
  id: string;
  email: string;
};

export function FinancialRecipientList({ recipients }: { recipients: Recipient[] }) {
  const [isPending, startTransition] = useTransition();

  if (recipients.length === 0) {
    return <p className="helperText">Nenhum email financeiro configurado.</p>;
  }

  return (
    <div className="ticketTable">
      {recipients.map((recipient) => (
        <div key={recipient.id} className="ticketRow">
          <div>
            <strong>{recipient.email}</strong>
            <span>Recebe lembretes manuais e automáticos de cobrança</span>
          </div>
          <button
            className="dangerButton"
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await fetch(`/api/financial/recipients/${recipient.id}`, {
                  method: "DELETE",
                });
                window.location.reload();
              });
            }}
          >
            {isPending ? "Removendo..." : "Remover"}
          </button>
        </div>
      ))}
    </div>
  );
}
