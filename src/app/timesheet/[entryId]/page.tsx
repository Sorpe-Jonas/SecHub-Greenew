import { UserRole } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { deleteTimeEntryAction } from "@/app/actions/timesheet-actions";
import { BrandHomeLink } from "@/components/layout/brand-home-link";
import { TimeEntryForm } from "@/components/timesheet/time-entry-form";
import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function TimesheetEntryPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const { entryId } = await params;
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.userId !== user.id) {
    notFound();
  }

  const ticketOptions = await prisma.ticket.findMany({
    where: user.companyId ? { companyId: user.companyId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
    },
  });

  return (
    <main className="supportShell">
      <section className="supportHeader">
        <div>
          <BrandHomeLink />
          <span className="eyebrow">TimeSheet</span>
          <h1>Editar lancamento</h1>
          <p>Voce pode ajustar horarios e descricao caso o atendimento precise de correcao manual.</p>
        </div>
      </section>

      <section className="supportPanel">
        <div className="panelHeader">
          <div>
            <span className="eyebrow">Acao</span>
            <h2>Editar ou remover</h2>
          </div>
        </div>
        <TimeEntryForm
          mode="edit"
          ticketOptions={ticketOptions}
          entry={{
            id: entry.id,
            ticketId: entry.ticketId,
            description: entry.description,
            entryType: entry.entryType,
            startedAt: toDatetimeLocal(entry.startedAt),
            endedAt: toDatetimeLocal(entry.endedAt),
          }}
        />
        <form action={deleteTimeEntryAction}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button className="dangerButton" type="submit">
            Deletar lancamento
          </button>
        </form>
      </section>
    </main>
  );
}
