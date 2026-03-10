"use server";

import { AuditModule, TicketCategory, TicketPriority, TicketStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/lib/authz";
import { notifyTicketCreated, notifyTicketReply } from "@/lib/notifications";
import { getTicketCatalogItem } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

export type TicketFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function createTicketAction(
  _prevState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await requireCurrentUser();

  if (!user.companyId) {
    return { error: "Usuario sem empresa vinculada." };
  }

  const categoryValue = getValue(formData, "category");
  const subcategory = getValue(formData, "subcategory");
  const title = getValue(formData, "title");
  const description = getValue(formData, "description");
  const priorityValue = getValue(formData, "priority");

  const category = Object.values(TicketCategory).find((item) => item === categoryValue);
  const priority = Object.values(TicketPriority).find((item) => item === priorityValue) ?? TicketPriority.MEDIUM;

  if (!category || !subcategory || !title || !description) {
    return { error: "Preencha categoria, subcategoria, titulo e descricao." };
  }

  const catalogItem = getTicketCatalogItem(category);

  if (!catalogItem) {
    return { error: "Categoria invalida." };
  }

  if (
    category !== TicketCategory.OTHER &&
    !catalogItem.subcategories.some((item) => item === subcategory)
  ) {
    return { error: "Subcategoria invalida para a categoria selecionada." };
  }

  const ticket = await prisma.ticket.create({
    data: {
      companyId: user.companyId,
      openedById: user.id,
      category,
      subcategory,
      title,
      description,
      priority,
      status: TicketStatus.OPEN,
      messages: {
        create: {
          authorId: user.id,
          message: description,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      module: AuditModule.TICKET,
      action: "ticket_created",
      entityType: "ticket",
      entityId: ticket.id,
      description: `Chamado criado: ${title}`,
      metadata: {
        category,
        subcategory,
        priority,
      },
    },
  });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { name: true },
  });

  await notifyTicketCreated(
    {
      ...ticket,
      company,
      openedBy: {
        name: user.name,
        email: user.email,
      },
    },
    description,
  ).catch((error) => {
    console.error("Falha ao enviar notificacao de novo ticket:", error);
  });

  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

export async function addTicketMessageAction(formData: FormData) {
  const user = await requireCurrentUser();
  const ticketId = getValue(formData, "ticketId");
  const message = getValue(formData, "message");

  if (!ticketId || !message) {
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      company: {
        select: {
          name: true,
        },
      },
      openedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    return;
  }

  const canReply =
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && user.companyId === ticket.companyId) ||
    ticket.openedById === user.id;

  if (!canReply) {
    return;
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: user.id,
      message,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ticket.companyId,
      userId: user.id,
      module: AuditModule.TICKET,
      action: "ticket_replied",
      entityType: "ticket",
      entityId: ticketId,
      description: "Nova resposta adicionada ao ticket.",
    },
  });

  await notifyTicketReply({
    ticket,
    author: {
      name: user.name,
      email: user.email,
    },
    message,
    isAdminReply: user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN,
  }).catch((error) => {
    console.error("Falha ao enviar notificacao de resposta:", error);
  });

  revalidatePath(`/support/${ticketId}`);
}
