import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  deletePasswordEntryAction,
  getDecryptedPassword,
  rollbackPasswordEntryAction,
} from "@/app/actions/password-actions";
import { AppShell } from "@/components/layout/app-shell";
import { SecretField } from "@/components/vault/secret-field";
import { PasswordEntryForm } from "@/components/vault/password-entry-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function VaultEntryDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const user = await requireCurrentUser();
  const { entryId } = await params;

  const entry = await prisma.passwordEntry.findUnique({
    where: { id: entryId },
    include: {
      vault: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 20,
      },
      createdBy: true,
      updatedBy: true,
    },
  });

  if (!entry || entry.deletedAt) {
    notFound();
  }

  if (user.role !== "SUPER_ADMIN" && user.companyId !== entry.companyId) {
    redirect("/vault");
  }

  const decryptedPassword = await getDecryptedPassword(entry.id);

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
          <span className="eyebrow">Cofre / {entry.vault.name}</span>
          <h1>{entry.title}</h1>
          <p>
            Credencial compartilhada pela empresa. Toda visualizacao e alteracao fica registrada na
            auditoria.
          </p>
        </div>
      </section>

      <section className="ticketDetailGrid">
        <article className="supportPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Credencial atual</span>
              <h2>Detalhes</h2>
            </div>
            <Link className="secondaryButton linkButton" href="/vault">
              Voltar
            </Link>
          </div>
          <div className="detailList">
            <div>
              <strong>Usuario</strong>
              <span>{entry.username}</span>
            </div>
            <div>
              <strong>Senha</strong>
              {decryptedPassword ? <SecretField value={decryptedPassword} /> : <span>Nao disponivel</span>}
            </div>
            <div>
              <strong>URL</strong>
              <span>{entry.url || "Nao informada"}</span>
            </div>
            <div>
              <strong>Tags</strong>
              <span>{entry.tags.length > 0 ? entry.tags.join(", ") : "Sem tags"}</span>
            </div>
            <div>
              <strong>Criado por</strong>
              <span>{entry.createdBy.name || entry.createdBy.email}</span>
            </div>
            <div>
              <strong>Ultima atualizacao</strong>
              <span>{entry.updatedAt.toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <div className="notesBlock">
            <strong>Observacoes</strong>
            <p>{entry.notes || "Sem observacoes."}</p>
          </div>
          <form action={deletePasswordEntryAction}>
            <input type="hidden" name="entryId" value={entry.id} />
            <button className="dangerButton" type="submit">
              Remover credencial
            </button>
          </form>
        </article>

        <article className="supportPanel">
          <h2>Editar credencial</h2>
          <PasswordEntryForm
            mode="edit"
            entry={{
              id: entry.id,
              title: entry.title,
              username: entry.username,
              url: entry.url,
              notes: entry.notes,
              tags: entry.tags,
            }}
            initialPassword={decryptedPassword || ""}
          />
        </article>
      </section>

      <section className="supportPanel">
        <h2>Rollback</h2>
        <div className="ticketTable">
          {entry.versions.length === 0 ? (
            <p className="helperText">Ainda nao existem versoes anteriores para esta credencial.</p>
          ) : (
            entry.versions.map((version) => (
              <div key={version.id} className="ticketRow">
                <div>
                  <strong>Versao {version.versionNumber}</strong>
                  <span>{version.createdAt.toLocaleString("pt-BR")}</span>
                </div>
                {user.role === "USER" ? null : (
                  <form action={rollbackPasswordEntryAction}>
                    <input type="hidden" name="entryId" value={entry.id} />
                    <input type="hidden" name="versionId" value={version.id} />
                    <button className="secondaryButton" type="submit">
                      Restaurar
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
