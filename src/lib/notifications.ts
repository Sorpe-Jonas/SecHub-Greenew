import nodemailer from "nodemailer";
import { type Company, type Ticket, type User } from "@prisma/client";

import { ticketCategoryLabels, ticketPriorityLabels, ticketStatusLabels } from "@/lib/tickets";

type TicketContext = Ticket & {
  company?: Pick<Company, "name"> | null;
  openedBy?: Pick<User, "name" | "email"> | null;
};

function formatPerson(user?: Pick<User, "name" | "email"> | null) {
  if (!user) {
    return "Usuario nao identificado";
  }

  return user.name ? `${user.name} <${user.email}>` : user.email;
}

function buildTicketTelegramMessage(ticket: TicketContext, message: string) {
  return [
    "SecHub Greenew",
    "",
    `Ticket: ${ticket.title}`,
    `Empresa: ${ticket.company?.name || "N/D"}`,
    `Solicitante: ${formatPerson(ticket.openedBy)}`,
    `Categoria: ${ticketCategoryLabels[ticket.category]}`,
    `Subcategoria: ${ticket.subcategory}`,
    `Prioridade: ${ticketPriorityLabels[ticket.priority]}`,
    `Status: ${ticketStatusLabels[ticket.status]}`,
    "",
    message,
  ].join("\n");
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
        <p style="margin:0 0 8px 0;color:#0e7490;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">SecHub Greenew</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.05">${params.heading}</h1>
        <p style="margin:0 0 24px 0;line-height:1.6;color:#475569">${params.intro}</p>
        <div style="padding:20px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:24px">
          <p style="margin:0 0 8px 0"><strong>Ticket:</strong> ${params.ticket.title}</p>
          <p style="margin:0 0 8px 0"><strong>Categoria:</strong> ${ticketCategoryLabels[params.ticket.category]} / ${params.ticket.subcategory}</p>
          <p style="margin:0 0 8px 0"><strong>Prioridade:</strong> ${ticketPriorityLabels[params.ticket.priority]}</p>
          <p style="margin:0"><strong>Status:</strong> ${ticketStatusLabels[params.ticket.status]}</p>
        </div>
        <div style="padding:20px;border-radius:16px;background:#0f172a;color:#e2e8f0">
          <p style="margin:0;white-space:pre-wrap;line-height:1.7">${params.message}</p>
        </div>
      </div>
    </div>
  `;
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

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

export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getMailTransporter();
  const from = process.env.SMTP_FROM;

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
  await sendTelegramMessage(buildTicketTelegramMessage(ticket, message));
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

  await sendTelegramMessage(
    buildTicketTelegramMessage(
      params.ticket,
      `${formatPerson(params.author)} adicionou uma resposta:\n\n${params.message}`,
    ),
  );
}
