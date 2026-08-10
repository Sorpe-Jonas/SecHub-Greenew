import Link from "next/link";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import {
  auditModuleLabels,
  buildAuditExportQuery,
  buildAuditWhereClause,
  getAuditFilters,
} from "@/lib/audit";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

  if (user.role === UserRole.USER) {
    redirect("/dashboard");
  }

  const filters = getAuditFilters(params);
  const where = buildAuditWhereClause({
    companyId: user.companyId,
    role: user.role,
    params,
  });

  const companies =
    user.role === UserRole.SUPER_ADMIN
      ? await prisma.company.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const logs = await prisma.auditLog.findMany({
    where,
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
    take: 200,
  });

  const exportQuery = buildAuditExportQuery(params);

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <section className="appPageHeader">
        <div>
          <span className="eyebrow">Administracao</span>
          <h1>Auditoria</h1>
          <p>Logs de autenticacao, cofre, tickets, usuarios e configuracoes da plataforma.</p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Eventos</span>
            <h2>Auditoria filtravel</h2>
          </div>
          <Link className="secondaryButton linkButton" href={`/audit/export${exportQuery ? `?${exportQuery}` : ""}`}>
            Exportar CSV
          </Link>
        </div>
        <form className="quickActionRow" method="get">
          <select className="selectInput" name="module" defaultValue={filters.module}>
            <option value="">Todos os modulos</option>
            {Object.entries(auditModuleLabels).map(([module, label]) => (
              <option key={module} value={module}>
                {label}
              </option>
            ))}
          </select>
          {user.role === UserRole.SUPER_ADMIN ? (
            <select className="selectInput" name="companyId" defaultValue={filters.companyId}>
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          ) : null}
          <input name="action" placeholder="Acao" defaultValue={filters.action} />
          <input name="entityType" placeholder="Entidade" defaultValue={filters.entityType} />
          <input name="q" placeholder="Buscar texto, usuario ou empresa" defaultValue={filters.query} />
          <input name="from" type="date" defaultValue={filters.from} />
          <input name="to" type="date" defaultValue={filters.to} />
          <button className="secondaryButton" type="submit">
            Filtrar
          </button>
          <Link className="secondaryButton linkButton" href="/audit">
            Limpar
          </Link>
        </form>
        <p className="helperText">Exibindo ate 200 registros na tela. A exportacao CSV usa os filtros atuais.</p>
        <div className="ticketTable">
          {logs.length === 0 ? (
            <p className="helperText">Nenhum log registrado ainda.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="messageItem">
                <div className="messageMeta">
                  <strong>
                    {auditModuleLabels[log.module]} · {log.action}
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
    </AppShell>
  );
}
