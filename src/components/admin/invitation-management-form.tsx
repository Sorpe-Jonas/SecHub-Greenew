"use client";

import { UserRole } from "@prisma/client";
import { useActionState } from "react";

import { type AdminFormState, updateInvitationAction } from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AdminFormState = {};

type InvitationManagementFormProps = {
  invitation: {
    id: string;
    email: string;
    role: UserRole;
    expiresAtIso: string;
    invitedUser: {
      name: string | null;
    } | null;
  };
  allowSuperAdmin: boolean;
};

export function InvitationManagementForm({ invitation, allowSuperAdmin }: InvitationManagementFormProps) {
  const [state, action] = useActionState(updateInvitationAction, initialState);
  const expiresAt = new Date(invitation.expiresAtIso);
  const isExpired = expiresAt < new Date();

  return (
    <form className="ticketForm" action={action}>
      <input type="hidden" name="invitationId" value={invitation.id} />
      <label>
        Nome
        <input name="name" type="text" defaultValue={invitation.invitedUser?.name || ""} placeholder="Nome do usuario" />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={invitation.email} placeholder="usuario@empresa.com" />
      </label>
      <label>
        Role
        <select className="selectInput" name="role" defaultValue={invitation.role}>
          <option value={UserRole.USER}>USER</option>
          <option value={UserRole.ADMIN}>ADMIN</option>
          {allowSuperAdmin ? <option value={UserRole.SUPER_ADMIN}>SUPER_ADMIN</option> : null}
        </select>
      </label>
      <label className="checkboxRow">
        <input name="resendInvite" type="checkbox" defaultChecked={isExpired} />
        <span>Reenviar convite e renovar validade por 7 dias</span>
      </label>
      <p className="helperText">
        {isExpired ? "Convite expirado." : "Convite ativo."} Expira em{" "}
        {expiresAt.toLocaleDateString("pt-BR")}.
      </p>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Salvar convite" pendingLabel="Salvando..." />
    </form>
  );
}
