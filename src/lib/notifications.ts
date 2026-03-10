import nodemailer from "nodemailer";
import { type Company, type Ticket, type User } from "@prisma/client";

import { getPlatformRuntimeConfig } from "@/lib/runtime-settings";
import { ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels } from "@/lib/tickets";

type TicketContext = Ticket & {
  company?: Pick<Company, "name"> | null;
  openedBy?: Pick<User, "name" | "email"> | null;
};

export const telegramNotificationCatalog = [
  {
    key: "ticket_created",
    label: "Novo ticket",
    description: "Envia quando um cliente abre um chamado novo.",
  },
  {
    key: "ticket_reply",
    label: "Resposta em ticket",
    description: "Envia quando ha nova resposta publica no chamado.",
  },
  {
    key: "ticket_status_updated",
    label: "Mudanca de status",
    description: "Envia quando status, prioridade ou responsavel do ticket mudam.",
  },
  {
    key: "financial_statement_generated",
    label: "Fechamento financeiro",
    description: "Envia quando um fechamento mensal e gerado ou atualizado.",
  },
  {
    key: "financial_reminder",
    label: "Lembrete financeiro",
    description: "Envia quando um lembrete de pagamento for disparado.",
  },
] as const;

export type TelegramNotificationEvent = (typeof telegramNotificationCatalog)[number]["key"];

function formatPerson(user?: Pick<User, "name" | "email"> | null) {
  if (!user) {
    return "Usuario nao identificado";
  }

  return user.name ? `${user.name} <${user.email}>` : user.email;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTicketEmailHtml(params: {
  title: string;
  heading: string;
  intro: string;
  ticket: TicketContext;
  message: string;
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7fb;padding:24px;color:#102033">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe7f3">
        <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">${params.heading}</h1>
        <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">${params.intro}</p>
        <div style="padding:20px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px">
          <p style="margin:0 0 8px 0"><strong>Ticket:</strong> ${params.ticket.title}</p>
          <p style="margin:0 0 8px 0"><strong>Categoria:</strong> ${ticketCategoryLabels[params.ticket.category]} / ${params.ticket.subcategory}</p>
          <p style="margin:0 0 8px 0"><strong>Prioridade:</strong> ${ticketPriorityLabels[params.ticket.priority]}</p>
          <p style="margin:0"><strong>Status:</strong> ${ticketStatusLabels[params.ticket.status]}</p>
        </div>
        <div style="padding:20px;border-radius:16px;background:#0f172a;color:#e2e8f0">
          <p style="margin:0;white-space:pre-wrap;line-height:1.7">${escapeHtml(params.message)}</p>
        </div>
      </div>
    </div>
  `;
}

function buildTelegramTemplate(params: {
  header: string;
  title: string;
  lines: string[];
  footer?: string;
}) {
  return [
    "SecHub",
    params.header,
    "",
    params.title,
    ...params.lines.filter(Boolean),
    ...(params.footer ? ["", params.footer] : []),
  ].join("\n");
}

async function getMailTransporter() {
  const config = await getPlatformRuntimeConfig();
  const host = config.smtp.host;
  const port = Number(config.smtp.port || 587);
  const user = config.smtp.user;
  const pass = config.smtp.pass;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function isTelegramEventEnabled(event: TelegramNotificationEvent) {
  const config = await getPlatformRuntimeConfig();

  if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) {
    return false;
  }

  if (!config.telegram.notificationEventsConfigured) {
    return true;
  }

  return config.telegram.notificationEvents.includes(event);
}

export async function sendTelegramMessage(text: string) {
  const config = await getPlatformRuntimeConfig();
  const token = config.telegram.botToken;
  const chatId = config.telegram.chatId;

  if (!config.telegram.enabled || !token || !chatId) {
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram retornou ${response.status}: ${body}`);
  }
}

export async function sendTelegramTemplate(
  event: TelegramNotificationEvent,
  params: {
    header: string;
    title: string;
    lines: string[];
    footer?: string;
  },
) {
  if (!(await isTelegramEventEnabled(event))) {
    return;
  }

  await sendTelegramMessage(buildTelegramTemplate(params));
}

export async function sendTelegramTestMessage() {
  await sendTelegramMessage(
    buildTelegramTemplate({
      header: "Teste de integracao",
      title: "Bot configurado com sucesso",
      lines: [
        "Este e um envio manual de validacao do painel do SecHub.",
        "Se esta mensagem chegou, o bot, o chat e as credenciais estao funcionando.",
      ],
      footer: "Voce pode ajustar os eventos enviados no painel de configuracoes.",
    }),
  );
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const config = await getPlatformRuntimeConfig();
  const transporter = await getMailTransporter();
  const from = config.smtp.from;

  if (!transporter || !from) {
    return;
  }

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export async function notifyTicketCreated(ticket: TicketContext, message: string) {
  await sendTelegramTemplate("ticket_created", {
    header: "Novo ticket",
    title: ticket.title,
    lines: [
      `Empresa: ${ticket.company?.name || "N/D"}`,
      `Solicitante: ${formatPerson(ticket.openedBy)}`,
      `Categoria: ${ticketCategoryLabels[ticket.category]} / ${ticket.subcategory}`,
      `Prioridade: ${ticketPriorityLabels[ticket.priority]}`,
      `Status: ${ticketStatusLabels[ticket.status]}`,
      "",
      `Resumo: ${message}`,
    ],
  });
}

export async function notifyTicketReply(params: {
  ticket: TicketContext;
  author: Pick<User, "name" | "email">;
  message: string;
  isAdminReply: boolean;
}) {
  if (params.isAdminReply && params.ticket.openedBy?.email) {
    await sendMail({
      to: params.ticket.openedBy.email,
      subject: `Atualizacao no ticket: ${params.ticket.title}`,
      html: buildTicketEmailHtml({
        title: params.ticket.title,
        heading: "Seu ticket recebeu uma resposta",
        intro: "Um administrador respondeu o seu chamado na plataforma.",
        ticket: params.ticket,
        message: `${formatPerson(params.author)} respondeu:\n\n${params.message}`,
      }),
    });
    return;
  }

  await sendTelegramTemplate("ticket_reply", {
    header: "Resposta em ticket",
    title: params.ticket.title,
    lines: [
      `Empresa: ${params.ticket.company?.name || "N/D"}`,
      `Autor: ${formatPerson(params.author)}`,
      `Status: ${ticketStatusLabels[params.ticket.status]}`,
      `Prioridade: ${ticketPriorityLabels[params.ticket.priority]}`,
      "",
      params.message,
    ],
  });
}

export async function notifyTicketStatusUpdated(params: {
  ticketTitle: string;
  companyName?: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
}) {
  await sendTelegramTemplate("ticket_status_updated", {
    header: "Ticket atualizado",
    title: params.ticketTitle,
    lines: [
      `Empresa: ${params.companyName || "N/D"}`,
      `Status: ${params.status}`,
      `Prioridade: ${params.priority}`,
      `Responsavel: ${params.assignedTo || "Nao atribuido"}`,
    ],
  });
}

export async function notifyFinancialStatementGenerated(params: {
  companyName?: string | null;
  referenceMonth: string;
  total: number;
  extraHoursUsed: number;
  visitCount: number;
}) {
  await sendTelegramTemplate("financial_statement_generated", {
    header: "Fechamento financeiro",
    title: `Competencia ${params.referenceMonth}`,
    lines: [
      `Empresa: ${params.companyName || "N/D"}`,
      `Total: R$ ${params.total.toFixed(2)}`,
      `Horas extras: ${params.extraHoursUsed.toFixed(2)}h`,
      `Visitas: ${params.visitCount}`,
    ],
  });
}

export async function notifyFinancialReminder(params: {
  companyName?: string | null;
  fileName: string;
  dueDate?: Date | null;
  documentUrl: string;
}) {
  await sendTelegramTemplate("financial_reminder", {
    header: "Lembrete financeiro",
    title: params.fileName,
    lines: [
      `Empresa: ${params.companyName || "N/D"}`,
      `Vencimento: ${params.dueDate ? params.dueDate.toLocaleDateString("pt-BR") : "Nao informado"}`,
      `Documento: ${params.documentUrl}`,
    ],
  });
}
