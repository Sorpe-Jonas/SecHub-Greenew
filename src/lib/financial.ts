import { FinancialDocumentType, type FinancialProfile } from "@prisma/client";

export const financialDocumentLabels: Record<FinancialDocumentType, string> = {
  INVOICE: "NFE / Nota fiscal",
  BOLETO: "Boleto",
  RECEIPT: "Recibo",
  OTHER: "Outro",
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function calculateExtraCharge(
  extraHoursUsed: number,
  profile: {
    extraHourlyRate: FinancialProfile["extraHourlyRate"] | number;
    extraHalfHourRate: FinancialProfile["extraHalfHourRate"] | number | null;
  },
) {
  const hourlyRate = Number(profile.extraHourlyRate || 0);
  const halfHourRate =
    profile.extraHalfHourRate !== null && profile.extraHalfHourRate !== undefined
      ? Number(profile.extraHalfHourRate)
      : hourlyRate / 2;
  const totalHalfHourBlocks = Math.round(extraHoursUsed * 2);
  const fullHours = Math.floor(totalHalfHourBlocks / 2);
  const halfHours = totalHalfHourBlocks % 2;

  return {
    fullHours,
    halfHours,
    hourlyRate,
    halfHourRate,
    total: fullHours * hourlyRate + halfHours * halfHourRate,
  };
}

export function buildFinancialSummary(params: {
  includedHoursUsed: number;
  extraHoursUsed: number;
  visitCount: number;
  subtotal: number;
  total: number;
  profile: Pick<FinancialProfile, "extraHourlyRate" | "extraHalfHourRate" | "visitRate">;
}) {
  const extra = calculateExtraCharge(params.extraHoursUsed, params.profile);
  const visitRate = Number(params.profile.visitRate || 0);
  const visitsTotal = params.visitCount * visitRate;

  return {
    includedHoursUsed: params.includedHoursUsed,
    extraHoursUsed: params.extraHoursUsed,
    visitCount: params.visitCount,
    subtotal: params.subtotal,
    total: params.total,
    extraChargeTotal: extra.total,
    extraHourBlocks: extra.fullHours,
    extraHalfHourBlocks: extra.halfHours,
    extraHourlyRate: extra.hourlyRate,
    extraHalfHourRate: extra.halfHourRate,
    visitRate,
    visitsTotal,
  };
}
