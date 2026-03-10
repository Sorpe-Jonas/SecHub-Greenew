"use server";

import { AuditModule, RunningTimerStatus, TimeEntryType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export type TimeEntryFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireTimesheetUser() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Apenas o Admin Total pode acessar o TimeSheet.");
  }

  if (!user.companyId) {
    throw new Error("Usuario sem empresa vinculada.");
  }

  return {
    ...user,
    companyId: user.companyId,
  };
}

export async function startTimerAction(formData: FormData) {
  const user = await requireTimesheetUser();
  const ticketId = getValue(formData, "ticketId");

  const running = await prisma.runningTimer.findFirst({
    where: {
      userId: user.id,
      status: RunningTimerStatus.RUNNING,
    },
  });

  if (running) {
    return;
  }

  const timer = await prisma.runningTimer.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      ticketId: ticketId || null,
      startedAt: new Date(),
      status: RunningTimerStatus.RUNNING,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.TIMESHEET,
      action: "timer_started",
      entityType: "running_timer",
      entityId: timer.id,
      description: "Timer de atendimento iniciado.",
    },
  });

  revalidatePath("/timesheet");
}

export async function stopTimerAction(formData: FormData) {
  const user = await requireTimesheetUser();
  const timerId = getValue(formData, "timerId");
  const description = getValue(formData, "description");

  const timer = await prisma.runningTimer.findUnique({
    where: { id: timerId },
  });

  if (!timer || timer.userId !== user.id || timer.status !== RunningTimerStatus.RUNNING) {
    return;
  }

  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - timer.startedAt.getTime()) / 60000));

  await prisma.$transaction([
    prisma.runningTimer.update({
      where: { id: timer.id },
      data: {
        status: RunningTimerStatus.STOPPED,
      },
    }),
    prisma.timeEntry.create({
      data: {
        companyId: timer.companyId,
        userId: timer.userId,
        ticketId: timer.ticketId,
        description: description || "Atendimento registrado por timer",
        entryType: timer.ticketId ? TimeEntryType.SUPPORT : TimeEntryType.OTHER,
        startedAt: timer.startedAt,
        endedAt,
        durationMinutes,
      },
    }),
    prisma.auditLog.create({
      data: {
        companyId: timer.companyId,
        userId: user.id,
        module: AuditModule.TIMESHEET,
        action: "timer_stopped",
        entityType: "running_timer",
        entityId: timer.id,
        description: `Timer encerrado com ${durationMinutes} minuto(s).`,
      },
    }),
  ]);

  revalidatePath("/timesheet");
}

export async function createManualTimeEntryAction(
  _prevState: TimeEntryFormState,
  formData: FormData,
): Promise<TimeEntryFormState> {
  const user = await requireTimesheetUser();
  const ticketId = getValue(formData, "ticketId");
  const description = getValue(formData, "description");
  const startedAt = parseDate(getValue(formData, "startedAt"));
  const endedAt = parseDate(getValue(formData, "endedAt"));
  const entryTypeValue = getValue(formData, "entryType");

  if (!startedAt || !endedAt || !description) {
    return { error: "Preencha inicio, fim e descricao." };
  }

  if (endedAt <= startedAt) {
    return { error: "O horario final precisa ser maior que o inicial." };
  }

  const entryType =
    Object.values(TimeEntryType).find((item) => item === entryTypeValue) ?? TimeEntryType.SUPPORT;
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  const entry = await prisma.timeEntry.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      ticketId: ticketId || null,
      description,
      entryType,
      startedAt,
      endedAt,
      durationMinutes,
      isManualEdit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.TIMESHEET,
      action: "time_entry_created",
      entityType: "time_entry",
      entityId: entry.id,
      description: `Lancamento manual criado com ${durationMinutes} minuto(s).`,
    },
  });

  revalidatePath("/timesheet");
  return {};
}

export async function updateTimeEntryAction(
  _prevState: TimeEntryFormState,
  formData: FormData,
): Promise<TimeEntryFormState> {
  const user = await requireTimesheetUser();
  const entryId = getValue(formData, "entryId");
  const ticketId = getValue(formData, "ticketId");
  const description = getValue(formData, "description");
  const startedAt = parseDate(getValue(formData, "startedAt"));
  const endedAt = parseDate(getValue(formData, "endedAt"));
  const entryTypeValue = getValue(formData, "entryType");

  if (!entryId || !startedAt || !endedAt || !description) {
    return { error: "Preencha os campos obrigatorios." };
  }

  if (endedAt <= startedAt) {
    return { error: "O horario final precisa ser maior que o inicial." };
  }

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.userId !== user.id) {
    return { error: "Lancamento nao encontrado." };
  }

  const entryType =
    Object.values(TimeEntryType).find((item) => item === entryTypeValue) ?? entry.entryType;
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      ticketId: ticketId || null,
      description,
      entryType,
      startedAt,
      endedAt,
      durationMinutes,
      isManualEdit: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.TIMESHEET,
      action: "time_entry_updated",
      entityType: "time_entry",
      entityId: entry.id,
      description: `Lancamento manual atualizado para ${durationMinutes} minuto(s).`,
    },
  });

  revalidatePath("/timesheet");
  return {};
}

export async function deleteTimeEntryAction(formData: FormData) {
  const user = await requireTimesheetUser();
  const entryId = getValue(formData, "entryId");

  if (!entryId) {
    return;
  }

  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.userId !== user.id) {
    return;
  }

  await prisma.$transaction([
    prisma.timeEntry.delete({
      where: { id: entry.id },
    }),
    prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        module: AuditModule.TIMESHEET,
        action: "time_entry_deleted",
        entityType: "time_entry",
        entityId: entry.id,
        description: `Lancamento removido com ${entry.durationMinutes} minuto(s).`,
      },
    }),
  ]);

  revalidatePath("/timesheet");
  revalidatePath(`/timesheet/${entry.id}`);
  redirect("/timesheet");
}
