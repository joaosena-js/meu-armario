import type { PackageUnit } from "@/lib/constants/domain";

export type MeasureGroup = "weight" | "volume" | "count";
export type ReferenceUnit = "kg" | "L" | "unidade";

export const MEASURE_GROUP_OF: Record<PackageUnit, MeasureGroup> = {
  g: "weight",
  kg: "weight",
  ml: "volume",
  L: "volume",
  unidade: "count",
};

export const MEASURE_GROUP_LABEL: Record<MeasureGroup, string> = {
  weight: "Peso",
  volume: "Volume",
  count: "Quantidade",
};

/** Unidade usada na exibição do preço: por kg, por litro ou por unidade. */
export const REFERENCE_UNIT_OF: Record<MeasureGroup, ReferenceUnit> = {
  weight: "kg",
  volume: "L",
  count: "unidade",
};

/** Quantas unidades base (g, ml, unidade) cabem em uma unidade de referência. */
export const BASE_PER_REFERENCE: Record<MeasureGroup, number> = {
  weight: 1000,
  volume: 1000,
  count: 1,
};

const TO_BASE_FACTOR: Record<PackageUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  L: 1000,
  unidade: 1,
};

/** Arredonda para 3 casas para eliminar ruído de ponto flutuante (ex.: 0,1 kg). */
function roundBase(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** 1 kg = 1.000 g */
export function kgToGrams(kg: number) {
  return roundBase(kg * 1000);
}

/** 1 L = 1.000 ml */
export function litersToMilliliters(liters: number) {
  return roundBase(liters * 1000);
}

/** Converte para a unidade base do grupo: g, ml ou unidade. */
export function toBaseQuantity(size: number, unit: PackageUnit) {
  return roundBase(size * TO_BASE_FACTOR[unit]);
}

export function areUnitsCompatible(a: PackageUnit, b: PackageUnit) {
  return MEASURE_GROUP_OF[a] === MEASURE_GROUP_OF[b];
}

export function referenceUnitLabel(unit: ReferenceUnit) {
  if (unit === "kg") return "kg";
  if (unit === "L") return "litro";
  return "unidade";
}
