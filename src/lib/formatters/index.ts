import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Cents } from "@/lib/calculations/money";
import type { ReferenceUnit } from "@/lib/calculations/units";
import { CONTROL_UNIT_PLURAL, type ControlUnit } from "@/lib/constants/domain";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 750 => "R$ 7,50" */
export function formatCents(cents: Cents | null | undefined) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "R$ 0,00";
  // Intl usa espaço não separável; trocamos por espaço comum para manter o padrão R$ 0,00
  return currencyFormatter.format(Math.round(cents) / 100).replace(/ /g, " ");
}

/** Valor em reais vindo do banco (numeric). */
export function formatReais(reais: number | string | null | undefined) {
  if (reais === null || reais === undefined || reais === "") return "R$ 0,00";
  return formatCents(Math.round(Number(reais) * 100));
}

const numberFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0";
  return numberFormatter.format(Number(value));
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Datas do tipo DATE chegam como "2026-11-03". parseISO interpreta como
 * data local, evitando o deslocamento de um dia que new Date() causaria.
 */
function toDate(value: string | Date) {
  return typeof value === "string" ? parseISO(value) : value;
}

/** DD/MM/AAAA */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "";
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  return isValid(date) ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "";
}

export function formatMonthYear(value: Date) {
  return format(value, "MMMM 'de' yyyy", { locale: ptBR });
}

/** Data de hoje no formato do input type="date" (AAAA-MM-DD), no fuso local. */
export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatQuantity(quantity: number | string, unit: ControlUnit | string) {
  const value = Number(quantity);
  const label = value === 1 ? unit : (CONTROL_UNIT_PLURAL[unit as ControlUnit] ?? unit);
  return `${formatNumber(value)} ${label}`;
}

export function formatPackage(size: number | string | null | undefined, unit: string | null | undefined, unitsPerPackage = 1) {
  if (size === null || size === undefined || !unit) return "";
  const base = unit === "unidade" ? `${formatNumber(size)} un.` : `${formatNumber(size)} ${unit}`;
  return unitsPerPackage > 1 ? `${unitsPerPackage} x ${base}` : base;
}

const REFERENCE_SUFFIX: Record<ReferenceUnit, string> = {
  kg: "/kg",
  L: "/L",
  unidade: "/un.",
};

/** Preço normalizado vindo do banco (reais) => "R$ 6,40/kg" */
export function formatNormalizedPrice(reais: number | string | null | undefined, unit: string | null | undefined) {
  if (reais === null || reais === undefined || !unit) return "";
  return `${formatReais(reais)}${REFERENCE_SUFFIX[unit as ReferenceUnit] ?? ""}`;
}

export function formatReferencePriceCents(cents: Cents, unit: ReferenceUnit) {
  return `${formatCents(cents)}${REFERENCE_SUFFIX[unit]}`;
}
