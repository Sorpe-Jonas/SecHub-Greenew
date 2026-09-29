import { AuditModule, Prisma, UserRole } from "@prisma/client";

export const auditModuleLabels: Record<AuditModule, string> = {
  AUTH: "Autenticacao",
  COMPANY: "Empresas",
  USER: "Usuarios",
  PERMISSION: "Permissoes",
  PASSWORD: "Cofre",
  TICKET: "Tickets",
  TIMESHEET: "TimeSheet",
  FINANCIAL: "Financeiro",
  NOTIFICATION: "Notificacoes",
  SETTINGS: "Configuracoes",
  LEAD: "Leads",
};

type AuditFilterInput = {
  companyId?: string | null;
  role: UserRole;
  params: Record<string, string | string[] | undefined>;
};

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

export function getAuditFilters(params: Record<string, string | string[] | undefined>) {
  const moduleFilter = getParam(params, "module");
  const action = getParam(params, "action");
  const entityType = getParam(params, "entityType");
  const companyId = getParam(params, "companyId");
  const query = getParam(params, "q");
  const from = getParam(params, "from");
  const to = getParam(params, "to");

  return {
    module: moduleFilter,
    action,
    entityType,
    companyId,
    query,
    from,
    to,
  };
}

export function buildAuditWhereClause({
  companyId,
  role,
  params,
}: AuditFilterInput): Prisma.AuditLogWhereInput {
  const filters = getAuditFilters(params);
  const where: Prisma.AuditLogWhereInput = {};
  const fromDate = parseDateStart(filters.from);
  const toDate = parseDateEnd(filters.to);

  if (role !== UserRole.SUPER_ADMIN) {
    where.companyId = companyId ?? undefined;
  } else if (filters.companyId) {
    where.companyId = filters.companyId;
  }

  if (filters.module && Object.values(AuditModule).includes(filters.module as AuditModule)) {
    where.module = filters.module as AuditModule;
  }

  if (filters.action) {
    where.action = {
      contains: filters.action,
      mode: "insensitive",
    };
  }

  if (filters.entityType) {
    where.entityType = {
      contains: filters.entityType,
      mode: "insensitive",
    };
  }

  if (filters.query) {
    where.OR = [
      {
        action: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        entityType: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        entityId: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        user: {
          is: {
            email: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        user: {
          is: {
            name: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
        },
      },
      {
        company: {
          is: {
            name: {
              contains: filters.query,
              mode: "insensitive",
            },
          },
        },
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

export function buildAuditExportQuery(params: Record<string, string | string[] | undefined>) {
  const filters = getAuditFilters(params);
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}
