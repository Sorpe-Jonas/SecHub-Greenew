import { InvitationStatus, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { InvitationManagementForm } from "@/components/admin/invitation-management-form";
import { UserAccessForm } from "@/components/admin/user-access-form";
import { UserInviteForm } from "@/components/admin/user-invite-form";
import { AppShell } from "@/components/layout/app-shell";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const currentUser = await requireCurrentUser();

  if (currentUser.role === UserRole.USER) {
    redirect("/dashboard");
  }

  const companyFilter =
    currentUser.role === UserRole.SUPER_ADMIN ? undefined : { companyId: currentUser.companyId ?? undefined };

  const [users, invitations, companies] = await Promise.all([
    prisma.user.findMany({
      where: companyFilter,
      include: {
        company: true,
        blockPermissions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.userInvitation.findMany({
      where: {
        ...(companyFilter ?? {}),
        status: InvitationStatus.PENDING,
      },
      include: {
        company: true,
        invitedUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.company.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <AppShell
      role={currentUser.role}
      permissions={currentUser.blockPermissions}
      userName={currentUser.name}
      userEmail={currentUser.email}
      companyName={currentUser.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Usuarios</span>
          <h1>Convites, roles e blocos</h1>
          <p>Crie acessos internos, acompanhe convites pendentes e ajuste os blocos disponiveis para cada usuario.</p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Novo convite</span>
              <h2>Adicionar usuario</h2>
            </div>
          </div>
          <UserInviteForm
            companies={companies}
            currentCompanyId={currentUser.companyId}
            canSelectCompany={currentUser.role === UserRole.SUPER_ADMIN}
          />
        </section>

        <section className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Pendencias</span>
              <h2>Convites pendentes</h2>
            </div>
          </div>
          <div className="ticketTable">
            {invitations.length === 0 ? (
              <p className="helperText">Nenhum convite pendente no momento.</p>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="statementCard">
                  <div className="ticketRow">
                    <div>
                      <strong>{invitation.invitedUser?.name || invitation.email}</strong>
                      <span>{invitation.email}</span>
                    </div>
                    <div>
                      <strong>{invitation.role}</strong>
                      <span>{invitation.company.name}</span>
                    </div>
                  </div>
                  <InvitationManagementForm
                    invitation={{
                      id: invitation.id,
                      email: invitation.email,
                      role: invitation.role,
                      expiresAtIso: invitation.expiresAt.toISOString(),
                      invitedUser: invitation.invitedUser,
                    }}
                    allowSuperAdmin={currentUser.role === UserRole.SUPER_ADMIN}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Acessos ativos</span>
            <h2>Usuarios da plataforma</h2>
          </div>
        </div>
        <div className="ticketTable">
          {users.map((user) => (
            <div key={user.id} className="statementCard">
              <div className="ticketRow">
                <div>
                  <strong>{user.name || user.email}</strong>
                  <span>{user.email}</span>
                </div>
                <div>
                  <strong>{user.role}</strong>
                  <span>
                    {user.company?.name || "Sem empresa"} · {user.status}
                  </span>
                </div>
              </div>
              <UserAccessForm
                user={{
                  id: user.id,
                  role: user.role,
                  status: user.status,
                  permissions: user.blockPermissions.filter((item) => item.canView).map((item) => item.block),
                }}
                allowSuperAdmin={currentUser.role === UserRole.SUPER_ADMIN}
              />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
