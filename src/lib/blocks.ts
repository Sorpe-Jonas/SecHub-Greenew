import { BlockKey, UserRole, type UserBlockPermission } from "@prisma/client";

export type DashboardCard = {
  block: BlockKey;
  title: string;
  description: string;
  href?: string;
  tone: "amber" | "cyan" | "slate";
  external?: boolean;
  roles: UserRole[];
};

export const dashboardCards: DashboardCard[] = [
  {
    block: BlockKey.PASSWORDS,
    title: "Cofre de Senhas",
    description: "Aplicativo interno para guardar e compartilhar segredos com seguranca.",
    href: "/vault",
    tone: "amber",
    roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.TICKETS,
    title: "Suporte e Tickets",
    description: "Canal central para abertura, acompanhamento e priorizacao de chamados.",
    href: "/support",
    tone: "cyan",
    roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.GRAFANA,
    title: "Grafana",
    description: "Acesso rapido aos paineis de observabilidade e indicadores operacionais.",
    tone: "slate",
    roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.TIMESHEET,
    title: "TimeSheet",
    description: "Controle de horas, atendimentos e visitas presenciais.",
    href: "/timesheet",
    tone: "amber",
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.FINANCIAL,
    title: "Financeiro",
    description: "Resumo financeiro, documentos e notificacoes de cobranca.",
    href: "/financial",
    tone: "slate",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.DOWNLOADS,
    title: "Downloads",
    description: "Biblioteca de arquivos e links para download.",
    href: "/downloads",
    tone: "cyan",
    roles: [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.USERS,
    title: "Usuarios",
    description: "Gestao de usuarios, convites e niveis de acesso por empresa.",
    href: "/users",
    tone: "cyan",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.COMPANIES,
    title: "Empresas",
    description: "Cadastro de empresas e visao consolidada do ambiente multiempresa.",
    href: "/companies",
    tone: "amber",
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.AUDIT,
    title: "Auditoria",
    description: "Rastreamento de eventos sensiveis, acessos e alteracoes da plataforma.",
    href: "/audit",
    tone: "slate",
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    block: BlockKey.SETTINGS,
    title: "Configuracoes",
    description: "Auth0, SMTP, Telegram, sessao e demais parametros globais.",
    href: "/settings",
    tone: "cyan",
    roles: [UserRole.SUPER_ADMIN],
  },
];

export function getVisibleCards(
  role: UserRole,
  permissions: Array<Pick<UserBlockPermission, "block" | "canView">>,
) {
  const permissionMap = new Map(permissions.map((permission) => [permission.block, permission.canView]));

  return dashboardCards.filter((card) => {
    if (!card.roles.includes(role)) {
      return false;
    }

    if (card.block === BlockKey.DOWNLOADS) {
      return true;
    }

    if (role === UserRole.SUPER_ADMIN) {
      return true;
    }

    return permissionMap.get(card.block) === true;
  });
}
