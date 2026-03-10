import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  type Prisma,
  UserRole,
} from "@prisma/client";

export const ticketCategoryLabels: Record<TicketCategory, string> = {
  PERSONAL: "Pessoal",
  COMPUTER: "Computador",
  INFRASTRUCTURE: "Infraestrutura",
  OTHER: "Outros Problemas",
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

export const ticketStatusLabels: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  TRIAGE: "Em triagem",
  IN_PROGRESS: "Em atendimento",
  WAITING_USER: "Aguardando usuario",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
  CANCELED: "Cancelado",
};

export const activeTicketStatuses = [
  TicketStatus.OPEN,
  TicketStatus.TRIAGE,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_USER,
] as const;

export const ticketCatalog = [
  {
    category: TicketCategory.PERSONAL,
    title: "Pessoal",
    description: "Conta, email, acessos, senhas e identidade digital.",
    subcategories: [
      "Reset de senha da conta",
      "Problema com email corporativo",
      "Reset de senha do email",
      "Reset de senha da maquina",
      "Acesso bloqueado",
      "MFA / autenticacao",
      "Permissao de sistema",
      "Assinatura de email",
      "Espaco na caixa postal",
      "Solicitacao de novo acesso",
    ],
  },
  {
    category: TicketCategory.COMPUTER,
    title: "Computador",
    description: "Hardware, software, lentidao, upgrade e perifericos.",
    subcategories: [
      "Problema de hardware",
      "Lentidao",
      "Instalacao de aplicativo",
      "Erro em software",
      "Upgrade de memoria",
      "Upgrade de armazenamento",
      "Troca de equipamento",
      "Problema com impressora",
      "Webcam / audio / microfone",
      "Formatacao / reinstalacao",
    ],
  },
  {
    category: TicketCategory.INFRASTRUCTURE,
    title: "Infraestrutura",
    description: "Rede, VPN, servidor, acesso remoto e indisponibilidade.",
    subcategories: [
      "Problema de rede",
      "Wi-Fi",
      "VPN",
      "Servidor indisponivel",
      "Acesso remoto",
      "Falha de DNS",
      "Compartilhamento de arquivos",
      "Firewall / bloqueio",
      "Link instavel",
      "Queda de servico",
    ],
  },
  {
    category: TicketCategory.OTHER,
    title: "Outros Problemas",
    description: "Formulario livre para casos fora das trilhas padrao.",
    subcategories: ["Formulario livre"],
  },
] as const;

export function getTicketCatalogItem(category?: string) {
  return ticketCatalog.find((item) => item.category === category);
}

export function buildTicketWhereClause(params: {
  companyId: string | null;
  userId: string;
  role: UserRole;
}): Prisma.TicketWhereInput {
  if (params.role === UserRole.SUPER_ADMIN) {
    return {};
  }

  if (params.role === UserRole.ADMIN) {
    return {
      companyId: params.companyId ?? undefined,
    };
  }

  return {
    openedById: params.userId,
  };
}

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value.trim() : "";
}

function parseDateStart(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateEnd(value: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTicketFilters(params: Record<string, string | string[] | undefined>) {
  return {
    status: getParam(params, "status"),
    priority: getParam(params, "priority"),
    opener: getParam(params, "opener"),
    companyId: getParam(params, "companyId"),
    from: getParam(params, "from"),
    to: getParam(params, "to"),
    q: getParam(params, "q"),
  };
}

export function buildTicketSearchWhereClause(params: {
  companyId: string | null;
  userId: string;
  role: UserRole;
  filters: Record<string, string | string[] | undefined>;
}): Prisma.TicketWhereInput {
  const baseWhere = buildTicketWhereClause({
    companyId: params.companyId,
    userId: params.userId,
    role: params.role,
  });
  const filterValues = getTicketFilters(params.filters);
  const where: Prisma.TicketWhereInput = { ...baseWhere };
  const fromDate = parseDateStart(filterValues.from);
  const toDate = parseDateEnd(filterValues.to);

  if (params.role === UserRole.SUPER_ADMIN && filterValues.companyId) {
    where.companyId = filterValues.companyId;
  }

  if (filterValues.status && Object.values(TicketStatus).includes(filterValues.status as TicketStatus)) {
    where.status = filterValues.status as TicketStatus;
  } else {
    where.status = {
      in: [...activeTicketStatuses],
    };
  }

  if (
    filterValues.priority &&
    Object.values(TicketPriority).includes(filterValues.priority as TicketPriority)
  ) {
    where.priority = filterValues.priority as TicketPriority;
  }

  if (filterValues.opener && params.role !== UserRole.USER) {
    where.openedBy = {
      is: {
        OR: [
          {
            name: {
              contains: filterValues.opener,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: filterValues.opener,
              mode: "insensitive",
            },
          },
        ],
      },
    };
  }

  if (filterValues.q) {
    where.AND = [
      ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
      {
        OR: [
          {
            title: {
              contains: filterValues.q,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: filterValues.q,
              mode: "insensitive",
            },
          },
          {
            subcategory: {
              contains: filterValues.q,
              mode: "insensitive",
            },
          },
          {
            openedBy: {
              is: {
                email: {
                  contains: filterValues.q,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            openedBy: {
              is: {
                name: {
                  contains: filterValues.q,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      },
    ];
  }

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  return where;
}

export function buildTicketExportQuery(params: Record<string, string | string[] | undefined>) {
  const filters = getTicketFilters(params);
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}
