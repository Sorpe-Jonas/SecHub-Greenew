import { LeadStatus } from "@prisma/client";

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Novo",
  IN_PROGRESS: "Em atendimento",
  WAITING_CONTRACT: "Aguardando contrato",
  SIGNED: "Assinado",
  ACTIVE_CLIENT: "Ativo como cliente",
  LOST: "Perdido",
};

export const leadStatusOrder: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.IN_PROGRESS,
  LeadStatus.WAITING_CONTRACT,
  LeadStatus.SIGNED,
  LeadStatus.ACTIVE_CLIENT,
  LeadStatus.LOST,
];
