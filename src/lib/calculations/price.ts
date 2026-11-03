import type { PackageUnit } from "@/lib/constants/domain";
import type { Cents } from "./money";
import {
  BASE_PER_REFERENCE,
  MEASURE_GROUP_OF,
  REFERENCE_UNIT_OF,
  toBaseQuantity,
  type MeasureGroup,
  type ReferenceUnit,
} from "./units";

export type PackageInput = {
  /** Preço total pago pelas embalagens, em centavos. */
  priceCents: Cents;
  /** Peso, volume ou quantidade de uma embalagem. */
  packageSize: number;
  packageUnit: PackageUnit;
  /** Quantidade de embalagens. */
  packagesCount: number;
  /** Itens dentro de cada embalagem (ex.: fardo com 12). Padrão 1. */
  unitsPerPackage?: number;
};

export type NormalizedPrice = {
  group: MeasureGroup;
  referenceUnit: ReferenceUnit;
  /** quantidade_total_base = embalagem convertida x embalagens (g, ml ou unidade) */
  totalBaseQuantity: number;
  /** Quantidade total na unidade de referência (kg, L ou unidade). */
  totalReferenceQuantity: number;
  /** Preço por unidade base, em centavos, sem arredondamento. */
  pricePerBaseUnit: number;
  /** Preço por kg, litro ou unidade, em centavos, sem arredondamento. */
  pricePerReferenceExact: number;
  /** Preço por kg, litro ou unidade, arredondado para centavos (exibição). */
  pricePerReferenceCents: Cents;
};

export class InvalidPackageError extends Error {}

/**
 * quantidade_total_base = quantidade_da_embalagem_convertida * quantidade_de_embalagens
 * preco_por_unidade_base = preco / quantidade_total_base
 */
export function normalizePrice(input: PackageInput): NormalizedPrice {
  const units = input.unitsPerPackage ?? 1;
  if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
    throw new InvalidPackageError("Preço inválido.");
  }
  if (!Number.isFinite(input.packageSize) || input.packageSize <= 0) {
    throw new InvalidPackageError("Peso, volume ou quantidade inválido.");
  }
  if (!Number.isInteger(input.packagesCount) || input.packagesCount < 1) {
    throw new InvalidPackageError("Quantidade de embalagens inválida.");
  }
  if (!Number.isInteger(units) || units < 1) {
    throw new InvalidPackageError("Unidades por embalagem inválidas.");
  }

  const group = MEASURE_GROUP_OF[input.packageUnit];
  const totalBaseQuantity = toBaseQuantity(input.packageSize, input.packageUnit) * units * input.packagesCount;
  const basePerReference = BASE_PER_REFERENCE[group];
  const pricePerBaseUnit = input.priceCents / totalBaseQuantity;
  // Multiplica antes de dividir para manter a precisão
  const pricePerReferenceExact = (input.priceCents * basePerReference) / totalBaseQuantity;

  return {
    group,
    referenceUnit: REFERENCE_UNIT_OF[group],
    totalBaseQuantity,
    totalReferenceQuantity: totalBaseQuantity / basePerReference,
    pricePerBaseUnit,
    pricePerReferenceExact,
    pricePerReferenceCents: Math.round(pricePerReferenceExact),
  };
}

/** Preço por kg. Aceita apenas g ou kg. */
export function pricePerKg(priceCents: Cents, size: number, unit: "g" | "kg", packagesCount = 1) {
  return normalizePrice({ priceCents, packageSize: size, packageUnit: unit, packagesCount }).pricePerReferenceCents;
}

/** Preço por litro. Aceita apenas ml ou L. */
export function pricePerLiter(priceCents: Cents, size: number, unit: "ml" | "L", packagesCount = 1) {
  return normalizePrice({ priceCents, packageSize: size, packageUnit: unit, packagesCount }).pricePerReferenceCents;
}

/** Preço por unidade. */
export function pricePerUnit(priceCents: Cents, units: number, packagesCount = 1) {
  return normalizePrice({ priceCents, packageSize: units, packageUnit: "unidade", packagesCount }).pricePerReferenceCents;
}

/**
 * Economia percentual:
 * ((maior_preco_unitario - menor_preco_unitario) / maior_preco_unitario) * 100
 * Retorna com duas casas decimais.
 */
export function savingsPercent(highestUnitPrice: number, lowestUnitPrice: number) {
  if (highestUnitPrice <= 0) return 0;
  const percent = ((highestUnitPrice - lowestUnitPrice) / highestUnitPrice) * 100;
  return Math.round(percent * 100) / 100;
}
