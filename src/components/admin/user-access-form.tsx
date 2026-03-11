"use client";

import { BlockKey, UserRole, UserStatus } from "@prisma/client";
import { useActionState } from "react";

import { type AdminFormState, deleteUserAction, updateUserAccessAction } from "@/app/actions/admin-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { blockLabels } from "@/lib/permissions";

const initialState: AdminFormState = {};

type UserAccessFormProps = {
  user: {
    id: string;
    role: UserRole;
    status: UserStatus;
    permissions: BlockKey[];
  };
  allowSuperAdmin: boolean;
};

export function UserAccessForm({ user, allowSuperAdmin }: UserAccessFormProps) {
  const [state, action] = useActionState(updateUserAccessAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteUserAction, initialState);

  return (
    <>
      <form className="ticketForm" action={action}>
        <input type="hidden" name="userId" value={user.id} />
        <label>
          Role
          <select className="selectInput" name="role" defaultValue={user.role}>
            <option value={UserRole.USER}>USER</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
            {allowSuperAdmin ? <option value={UserRole.SUPER_ADMIN}>SUPER_ADMIN</option> : null}
          </select>
        </label>
        <label>
          Status
          <select className="selectInput" name="status" defaultValue={user.status}>
            <option value={UserStatus.ACTIVE}>ACTIVE</option>
            <option value={UserStatus.DISABLED}>DISABLED</option>
            <option value={UserStatus.PENDING}>PENDING</option>
          </select>
        </label>
        <div className="permissionGrid">
          {Object.values(BlockKey).map((block) => (
            <label key={block} className="checkboxRow">
              <input name={`block_${block}`} type="checkbox" defaultChecked={user.permissions.includes(block)} />
              <span>{blockLabels[block]}</span>
            </label>
          ))}
        </div>
        {state.error ? <p className="errorText">{state.error}</p> : null}
        <SubmitButton idleLabel="Salvar acessos" pendingLabel="Salvando..." />
      </form>

      <form action={deleteAction}>
        <input type="hidden" name="userId" value={user.id} />
        {deleteState.error ? <p className="errorText">{deleteState.error}</p> : null}
        <SubmitButton idleLabel="Excluir usuario" pendingLabel="Excluindo..." />
      </form>
    </>
  );
}
