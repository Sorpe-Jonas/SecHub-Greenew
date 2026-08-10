import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { VaultQuickActions } from "@/components/vault/vault-quick-actions";
import { PasswordEntryForm } from "@/components/vault/password-entry-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function VaultPage() {
  const user = await requireCurrentUser();

  const entries = await prisma.passwordEntry.findMany({
    where:
      user.role === "SUPER_ADMIN"
        ? { deletedAt: null }
        : {
            companyId: user.companyId ?? undefined,
            deletedAt: null,
          },
    include: {
      vault: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <AppShell
      role={user.role}
      permissions={user.blockPermissions}
      userName={user.name}
      userEmail={user.email}
      companyName={user.company?.name}
    >
      <div className="dashboardPage">
        <header className="appPageHeader">
          <div>
            <span className="eyebrow">Senhas</span>
            <h1>Cofre corporativo</h1>
            <p>
              Credenciais compartilhadas por empresa com criptografia, historico de versoes e trilha
              de auditoria para visualizacao, edicao e rollback.
            </p>
          </div>
        </header>

        <section className="ticketDetailGrid">
          <article className="supportPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Nova credencial</span>
                <h2>Cadastrar no cofre</h2>
              </div>
            </div>
            <PasswordEntryForm mode="create" />
          </article>

          <article className="supportPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Credenciais</span>
                <h2>Itens atuais</h2>
              </div>
            </div>
            <div className="ticketTable">
              {entries.length === 0 ? (
                <p className="helperText">Nenhuma credencial cadastrada ainda.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="statementCard">
                    <Link className="ticketRow" href={`/vault/${entry.id}`}>
                      <div>
                        <strong>{entry.title}</strong>
                        <span>
                          {entry.username} · {entry.vault.name}
                        </span>
                      </div>
                      <div>
                        <strong>{entry.url ? "Com URL" : "Sem URL"}</strong>
                        <span>{entry.tags.length > 0 ? entry.tags.join(", ") : "Sem tags"}</span>
                      </div>
                    </Link>
                    <VaultQuickActions
                      entryId={entry.id}
                      username={entry.username}
                      url={entry.url}
                      canDelete={user.role === "SUPER_ADMIN" || user.role === "ADMIN"}
                    />
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
