"use server";

import {
  AuditModule,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";

import { requireCurrentUser } from "@/lib/authz";
import { notifyTicketCreated, notifyTicketReply, sendMail } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getTicketCatalogItem } from "@/lib/tickets";

export type TicketFormState = {
  error?: string;
};

function getValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

async function storeTicketAttachment(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = sanitizeFileName(file.name || "anexo");
  const relativeDir = path.join("uploads", "tickets");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const finalName = `${Date.now()}-${randomUUID()}-${safeName}`;

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, finalName), buffer);

  return {
    fileName: file.name || safeName,
    storagePath: `/${path.join(relativeDir, finalName).replace(/\\/g, "/")}`,
    mimeType: file.type || "application/octet-stream",
  };
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
  const isInternal = getValue(formData, "isInternal") === "on";

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
      isInternal,
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
      description: isInternal ? "Nota interna adicionada ao ticket." : "Nova resposta adicionada ao ticket.",
    },
  });

  if (!isInternal) {
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
  }

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
}

export async function updateTicketManagementAction(
  _prevState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await requireCurrentUser();
  const ticketId = getValue(formData, "ticketId");
  const statusValue = getValue(formData, "status");
  const priorityValue = getValue(formData, "priority");
  const assignedToId = getValue(formData, "assignedToId");

  const status = Object.values(TicketStatus).find((item) => item === statusValue);
  const priority = Object.values(TicketPriority).find((item) => item === priorityValue);

  if (!ticketId || !status || !priority) {
    return { error: "Dados do ticket invalidos." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      companyId: true,
      title: true,
      openedBy: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!ticket) {
    return { error: "Ticket nao encontrado." };
  }

  const canManage =
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && user.companyId === ticket.companyId);

  if (!canManage) {
    return { error: "Sem permissao para gerenciar este ticket." };
  }

  let finalAssignedToId: string | null = null;
  if (assignedToId) {
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: {
        id: true,
        companyId: true,
        role: true,
      },
    });

    if (!assignedUser || assignedUser.companyId !== ticket.companyId) {
      return { error: "Responsavel invalido para este ticket." };
    }

    finalAssignedToId = assignedUser.id;
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      priority,
      assignedToId: finalAssignedToId,
      closedAt: status === TicketStatus.CLOSED ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ticket.companyId,
      userId: user.id,
      module: AuditModule.TICKET,
      action: "ticket_management_updated",
      entityType: "ticket",
      entityId: ticketId,
      description: `Ticket atualizado para status ${status} e prioridade ${priority}.`,
      metadata: {
        assignedToId: finalAssignedToId,
      },
    },
  });

  if (ticket.openedBy.email) {
    await sendMail({
      to: ticket.openedBy.email,
      subject: `Atualizacao no ticket: ${ticket.title}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
            <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
            <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">Seu ticket foi atualizado</h1>
            <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">
              O chamado <strong>${ticket.title}</strong> agora esta com status <strong>${status}</strong> e prioridade <strong>${priority}</strong>.
            </p>
          </div>
        </div>
      `,
    }).catch((error) => {
      console.error("Falha ao enviar notificacao de atualizacao de ticket:", error);
    });
  }

  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  return {};
}

export async function addTicketAttachmentAction(
  _prevState: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const user = await requireCurrentUser();
  const ticketId = getValue(formData, "ticketId");
  let fileName = getValue(formData, "fileName");
  let mimeType = getValue(formData, "mimeType") || "application/octet-stream";
  let storagePath = getValue(formData, "storagePath");
  const uploadedFile = formData.get("file");

  if (!ticketId) {
    return { error: "Ticket invalido." };
  }

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    const stored = await storeTicketAttachment(uploadedFile);
    fileName = fileName || stored.fileName;
    mimeType = mimeType || stored.mimeType;
    storagePath = stored.storagePath;
  }

  if (!fileName || !storagePath) {
    return { error: "Informe um arquivo ou um caminho/URL para o anexo." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      companyId: true,
      openedById: true,
    },
  });

  if (!ticket) {
    return { error: "Ticket nao encontrado." };
  }

  const canAttach =
    user.role === UserRole.SUPER_ADMIN ||
    (user.role === UserRole.ADMIN && user.companyId === ticket.companyId) ||
    user.id === ticket.openedById;

  if (!canAttach) {
    return { error: "Sem permissao para anexar a este ticket." };
  }

  await prisma.ticketAttachment.create({
    data: {
      ticketId,
      uploadedById: user.id,
      fileName,
      mimeType,
      storagePath,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ticket.companyId,
      userId: user.id,
      module: AuditModule.TICKET,
      action: "ticket_attachment_added",
      entityType: "ticket",
      entityId: ticketId,
      description: `Anexo ${fileName} adicionado ao ticket.`,
    },
  });

  revalidatePath(`/support/${ticketId}`);
  return {};
}
