import { PrismaClient, TimeEntryType } from "@prisma/client";

const prisma = new PrismaClient();

function parseBooleanFlag(value) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

async function main() {
  const dryRun = parseBooleanFlag(process.env.DRY_RUN);
  const companyId = process.env.COMPANY_ID?.trim() || null;

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      entryType: TimeEntryType.ON_SITE,
      visitEntry: {
        is: null,
      },
    },
    select: {
      id: true,
      companyId: true,
      userId: true,
      ticketId: true,
      description: true,
      startedAt: true,
    },
    orderBy: {
      startedAt: "asc",
    },
  });

  if (entries.length === 0) {
    console.log("Nenhum lancamento ON_SITE sem VisitEntry foi encontrado.");
    return;
  }

  const companyIds = [...new Set(entries.map((entry) => entry.companyId))];
  const profiles = await prisma.financialProfile.findMany({
    where: {
      companyId: {
        in: companyIds,
      },
    },
    select: {
      companyId: true,
      visitRate: true,
    },
  });

  const visitRateByCompanyId = new Map(
    profiles.map((profile) => [profile.companyId, profile.visitRate]),
  );

  console.log(
    `Encontrado(s) ${entries.length} lancamento(s) ON_SITE sem VisitEntry.${dryRun ? " Executando em DRY_RUN." : ""}`,
  );

  let createdCount = 0;

  for (const entry of entries) {
    const amount = visitRateByCompanyId.get(entry.companyId) ?? 0;

    if (dryRun) {
      console.log(
        [
          "DRY_RUN",
          `timeEntryId=${entry.id}`,
          `companyId=${entry.companyId}`,
          `visitDate=${entry.startedAt.toISOString()}`,
          `amount=${amount.toString()}`,
        ].join(" "),
      );
      continue;
    }

    await prisma.visitEntry.create({
      data: {
        companyId: entry.companyId,
        userId: entry.userId,
        ticketId: entry.ticketId,
        timeEntryId: entry.id,
        visitDate: entry.startedAt,
        description: entry.description,
        amount,
      },
    });

    createdCount += 1;
  }

  if (!dryRun) {
    console.log(`Backfill concluido. ${createdCount} VisitEntry criado(s).`);
  }
}

main()
  .catch((error) => {
    console.error("Falha ao executar backfill de visitas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
