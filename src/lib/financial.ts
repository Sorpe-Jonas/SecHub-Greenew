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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

export function formatFinancialPeriodLabel(start: Date, endExclusive: Date) {
  const endInclusive = addDays(endExclusive, -1);
  return `${formatDate(start)} a ${formatDate(endInclusive)}`;
}

export function getMonthBounds(referenceMonth: string) {
  const base = new Date(`${referenceMonth}-01T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

export function getFinancialCycleBounds(params: {
  anchorDate: Date;
  billingDay?: number | null;
  contractStartDate?: Date | null;
  clampEndToAnchorDate?: boolean;
}) {
  const anchor = startOfDay(params.anchorDate);
  const billingDay = Math.max(1, Math.min(31, params.billingDay ?? 1));

  if (!params.contractStartDate) {
    const anchorDay = anchor.getDate();
    const startMonthOffset = anchorDay >= billingDay ? 0 : -1;
    const cycleStart = new Date(anchor.getFullYear(), anchor.getMonth() + startMonthOffset, 1);
    const start = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), billingDay);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, billingDay);

    if (params.clampEndToAnchorDate && end.getTime() > anchor.getTime()) {
      return { start, end: addDays(anchor, 1) };
    }

    return { start, end };
  }

  const cycleLengthDays = 30;
  const contractStart = startOfDay(params.contractStartDate);
  const elapsedMs = anchor.getTime() - contractStart.getTime();
  const elapsedDays = Math.floor(elapsedMs / 86400000);
  const cycleIndex = elapsedDays >= 0 ? Math.floor(elapsedDays / cycleLengthDays) : 0;
  const start = addDays(contractStart, cycleIndex * cycleLengthDays);
  const end = addDays(start, cycleLengthDays);

  if (params.clampEndToAnchorDate && end.getTime() > anchor.getTime()) {
    return { start, end: addDays(anchor, 1) };
  }

  return { start, end };
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

export function formatDecimalHoursToHMM(decimalHours: number) {
  const totalMinutes = Math.round(Number(decimalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours}h${minutes.toString().padStart(2, "0")}min`;
}
