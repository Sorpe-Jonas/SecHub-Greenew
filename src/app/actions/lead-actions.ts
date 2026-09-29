"use server";

import { AuditModule, LeadStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/authz";
import { createCalendarMeeting, getCalendarClientForUser } from "@/lib/google-calendar";
import { leadStatusLabels } from "@/lib/leads";
import { sendTelegramMessage } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";

export type LeadFormState = {
  error?: string;
  success?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireSuperAdmin() {
  const user = await requireCurrentUser();

  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error("Somente o Admin Total pode gerenciar leads.");
  }

  return user;
}

export async function createLeadAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  if (getValue(formData, "website")) {
    redirect("/contato/obrigado");
  }

  const name = getValue(formData, "name");
  const phone = getValue(formData, "phone");
  const companyName = getValue(formData, "companyName");
  const email = getValue(formData, "email");
  const description = getValue(formData, "description");

  if (!name || !phone || !companyName || !email || !description) {
    return { error: "Preencha todos os campos para enviar." };
  }

  if (!isEmail(email)) {
    return { error: "Informe um e-mail valido." };
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      companyName,
      email,
      description,
      source: "landing",
    },
  });

  try {
    await sendTelegramMessage(
      [
        "SecHub",
        "Novo lead recebido",
        "",
        `Nome: ${name}`,
        `Empresa: ${companyName}`,
        `E-mail: ${email}`,
        `Telefone: ${phone}`,
        `Lead ID: ${lead.id}`,
      ].join("\n"),
    );
  } catch {
    // Notificacao opcional: nao bloqueia o registro do lead.
  }

  redirect("/contato/obrigado");
}

export async function updateLeadStatusAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const user = await requireSuperAdmin();
  const leadId = getValue(formData, "leadId");
  const statusValue = getValue(formData, "status");
  const status = Object.values(LeadStatus).find((item) => item === statusValue);

  if (!leadId || !status) {
    return { error: "Selecione um status valido." };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { error: "Lead nao encontrado." };
  }

  await prisma.lead.update({ where: { id: lead.id }, data: { status } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.LEAD,
      action: "lead_status_updated",
      entityType: "lead",
      entityId: lead.id,
      description: `Lead ${lead.name} atualizado para ${leadStatusLabels[status]}.`,
    },
  });

  revalidatePath("/leads");
  return { success: "Status atualizado." };
}

export async function createLeadMeetingAction(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const user = await requireSuperAdmin();

  const leadId = getValue(formData, "leadId");
  const dateTime = getValue(formData, "dateTime");
  const durationInput = Number(getValue(formData, "durationMin") || "30");
  const summaryInput = getValue(formData, "summary");

  if (!leadId || !dateTime) {
    return { error: "Informe a data e o horario da reuniao." };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return { error: "Lead nao encontrado." };
  }

  const client = await getCalendarClientForUser(user.id);
  if (!client) {
    return { error: "Conecte sua conta Google Calendar antes de agendar." };
  }

  const runtime = await getPlatformRuntimeConfig();
  const durationMinutes = Number.isFinite(durationInput) && durationInput >= 15 ? durationInput : 30;

  try {
    const event = await createCalendarMeeting({
      calendar: client.calendar,
      calendarId: client.connection.calendarId || runtime.google.calendarId,
      timeZone: runtime.google.timeZone,
      summary: summaryInput || `Reuniao SecHub - ${lead.companyName}`,
      description: [
        `Lead: ${lead.name}`,
        `Empresa: ${lead.companyName}`,
        `E-mail: ${lead.email}`,
        `Telefone: ${lead.phone}`,
        "",
        "Descricao:",
        lead.description,
      ].join("\n"),
      startLocal: dateTime,
      durationMinutes,
      attendee: { email: lead.email, name: lead.name },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        meetingAt: new Date(dateTime),
        meetingDurationMin: durationMinutes,
        meetingEventId: event.id ?? null,
        meetingHtmlLink: event.htmlLink ?? null,
        meetingCreatedById: user.id,
        status: lead.status === LeadStatus.NEW ? LeadStatus.IN_PROGRESS : lead.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        module: AuditModule.LEAD,
        action: "lead_meeting_created",
        entityType: "lead",
        entityId: lead.id,
        description: `Reuniao agendada com ${lead.name} para ${dateTime}.`,
      },
    });

    revalidatePath("/leads");
    return { success: "Reuniao criada e convite enviado ao lead." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Falha ao criar a reuniao no Google Calendar.",
    };
  }
}

export async function disconnectGoogleCalendarAction(): Promise<LeadFormState> {
  const user = await requireSuperAdmin();

  await prisma.googleCalendarConnection.deleteMany({ where: { userId: user.id } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.LEAD,
      action: "google_calendar_disconnected",
      entityType: "google_calendar_connection",
      entityId: user.id,
      description: "Conta Google Calendar desconectada.",
    },
  });

  revalidatePath("/leads");
  return { success: "Conta Google Calendar desconectada." };
}
