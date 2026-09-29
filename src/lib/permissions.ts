import { BlockKey, UserRole } from "@prisma/client";

export const blockLabels: Record<BlockKey, string> = {
  PASSWORDS: "Senhas",
  TICKETS: "Tickets",
  GRAFANA: "Grafana",
  TIMESHEET: "TimeSheet",
  FINANCIAL: "Financeiro",
  DOWNLOADS: "Downloads",
  USERS: "Usuarios",
  COMPANIES: "Empresas",
  AUDIT: "Auditoria",
  SETTINGS: "Configuracoes",
  LEADS: "Leads",
};

export function getDefaultBlocksForRole(role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) {
    return Object.values(BlockKey);
  }

  if (role === UserRole.ADMIN) {
    return [
      BlockKey.PASSWORDS,
      BlockKey.TICKETS,
      BlockKey.GRAFANA,
      BlockKey.FINANCIAL,
      BlockKey.DOWNLOADS,
      BlockKey.USERS,
    ];
  }

  return [BlockKey.PASSWORDS, BlockKey.TICKETS, BlockKey.GRAFANA, BlockKey.DOWNLOADS];
}
