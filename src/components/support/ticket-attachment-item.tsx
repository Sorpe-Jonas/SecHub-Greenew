"use client";

import { useTransition } from "react";

type TicketAttachmentItemProps = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  uploadedByLabel: string;
  canDelete: boolean;
};

export function TicketAttachmentItem(props: TicketAttachmentItemProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="attachmentItem">
      <a className="subcardLink" href={props.storagePath} target="_blank" rel="noreferrer">
        <strong>{props.fileName}</strong>
        <span>{props.mimeType}</span>
        <span>{props.uploadedByLabel}</span>
      </a>
      {props.canDelete ? (
        <button
          className="dangerButton"
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await fetch(`/api/tickets/attachments/${props.attachmentId}`, {
                method: "DELETE",
              });
              window.location.reload();
            });
          }}
        >
          {isPending ? "Removendo..." : "Remover"}
        </button>
      ) : null}
    </div>
  );
}
