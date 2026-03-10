"use client";

import { UserRole } from "@prisma/client";
import { useActionState } from "react";

import { type AdminFormState, inviteUserAction } from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: AdminFormState = {};

type UserInviteFormProps = {
  companies: Array<{ id: string; name: string }>;
  currentCompanyId: string | null;
  canSelectCompany: boolean;
};

export function UserInviteForm({
  companies,
  currentCompanyId,
  canSelectCompany,
}: UserInviteFormProps) {
  const [state, action] = useActionState(inviteUserAction, initialState);

  return (
    <form className="ticketForm" action={action}>
      {canSelectCompany ? (
        <label>
          Empresa
          <select className="selectInput" name="companyId" defaultValue={currentCompanyId || companies[0]?.id || ""}>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
      ) : currentCompanyId ? (
        <input type="hidden" name="companyId" value={currentCompanyId} />
      ) : null}
      <label>
        Nome
        <input name="name" type="text" placeholder="Nome do usuario" />
      </label>
      <label>
        Email
        <input name="email" type="email" placeholder="usuario@empresa.com" />
      </label>
      <label>
        Role
        <select className="selectInput" name="role" defaultValue={UserRole.USER}>
          <option value={UserRole.USER}>USER</option>
          <option value={UserRole.ADMIN}>ADMIN</option>
          {canSelectCompany ? <option value={UserRole.SUPER_ADMIN}>SUPER_ADMIN</option> : null}
        </select>
      </label>
      {state.error ? <p className="errorText">{state.error}</p> : null}
      <SubmitButton idleLabel="Enviar convite" pendingLabel="Enviando..." />
    </form>
  );
}
