import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const user = await requireCurrentUser();

  if (user.role === UserRole.USER) {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    where: user.role === UserRole.SUPER_ADMIN ? undefined : { companyId: user.companyId ?? undefined },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      company: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">Administracao</span>
          <h1>Auditoria</h1>
          <p>Logs de autenticacao, cofre, tickets, usuarios e configuracoes da plataforma.</p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Eventos</span>
            <h2>Ultimos 100 registros</h2>
          </div>
        </div>
        <div className="ticketTable">
          {logs.length === 0 ? (
            <p className="helperText">Nenhum log registrado ainda.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="messageItem">
                <div className="messageMeta">
                  <strong>
                    {log.module} · {log.action}
                  </strong>
                  <span>{log.createdAt.toLocaleString("pt-BR")}</span>
                </div>
                <p>{log.description || "Sem descricao."}</p>
                <div className="detailList">
                  <div>
                    <strong>Usuario</strong>
                    <span>{log.user?.name || log.user?.email || "Sistema"}</span>
                  </div>
                  <div>
                    <strong>Empresa</strong>
                    <span>{log.company?.name || "Global"}</span>
                  </div>
                  <div>
                    <strong>Entidade</strong>
                    <span>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
