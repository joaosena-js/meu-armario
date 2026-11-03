import type { PackageUnit } from "@/lib/constants/domain";
import type { Cents } from "./money";
import { normalizePrice, savingsPercent, type NormalizedPrice } from "./price";
import { MEASURE_GROUP_OF, type MeasureGroup } from "./units";

export type ComparatorOption = {
  id: string;
  name: string;
  brand?: string;
  priceCents: Cents;
  packageSize: number;
  packageUnit: PackageUnit;
  packagesCount: number;
};

export type ComparatorOptionResult = ComparatorOption & NormalizedPrice;

export type ComparatorResult =
  | {
      ok: true;
      group: MeasureGroup;
      options: ComparatorOptionResult[];
      /** Menor preço por kg, litro ou unidade (melhor custo-benefício). */
      bestValueId: string;
      lowestTotalPriceId: string;
      largestPackageId: string;
      highestPricePerReference: number;
      lowestPricePerReference: number;
      savingsPercent: number;
    }
  | { ok: false; reason: "not_enough_options" | "incompatible_units"; groups?: MeasureGroup[] };

/**
 * Regra 10: só compara opções do mesmo grupo de medida.
 * Em empate de preço por referência, vence a primeira opção informada.
 */
export function compareOptions(options: ComparatorOption[]): ComparatorResult {
  if (options.length < 2) return { ok: false, reason: "not_enough_options" };

  const groups = Array.from(new Set(options.map((o) => MEASURE_GROUP_OF[o.packageUnit])));
  if (groups.length > 1) return { ok: false, reason: "incompatible_units", groups };

  const results: ComparatorOptionResult[] = options.map((option) => ({
    ...option,
    ...normalizePrice({
      priceCents: option.priceCents,
      packageSize: option.packageSize,
      packageUnit: option.packageUnit,
      packagesCount: option.packagesCount,
    }),
  }));

  const pickBy = (score: (o: ComparatorOptionResult) => number, prefer: "min" | "max") =>
    results.reduce((best, current) => {
      const a = score(current);
      const b = score(best);
      return (prefer === "min" ? a < b : a > b) ? current : best;
    });

  const best = pickBy((o) => o.pricePerReferenceExact, "min");
  const worst = pickBy((o) => o.pricePerReferenceExact, "max");

  return {
    ok: true,
    group: groups[0],
    options: results,
    bestValueId: best.id,
    lowestTotalPriceId: pickBy((o) => o.priceCents, "min").id,
    largestPackageId: pickBy((o) => o.totalBaseQuantity, "max").id,
    highestPricePerReference: worst.pricePerReferenceExact,
    lowestPricePerReference: best.pricePerReferenceExact,
    savingsPercent: savingsPercent(worst.pricePerReferenceExact, best.pricePerReferenceExact),
  };
}
