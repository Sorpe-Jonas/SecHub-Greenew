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
