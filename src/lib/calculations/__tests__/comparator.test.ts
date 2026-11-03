import { describe, expect, it } from "vitest";

import { compareOptions, type ComparatorOption } from "../comparator";

const arrozA: ComparatorOption = { id: "a", name: "Produto A", priceCents: 750, packageSize: 1, packageUnit: "kg", packagesCount: 1 };
const arrozB: ComparatorOption = { id: "b", name: "Produto B", priceCents: 3200, packageSize: 5, packageUnit: "kg", packagesCount: 1 };

describe("comparador", () => {
  it("reproduz o exemplo da especificação", () => {
    const result = compareOptions([arrozA, arrozB]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bestValueId).toBe("b");
    expect(result.lowestTotalPriceId).toBe("a");
    expect(result.largestPackageId).toBe("b");
    expect(result.savingsPercent).toBe(14.67);
    expect(result.options.find((o) => o.id === "a")?.pricePerReferenceCents).toBe(750);
    expect(result.options.find((o) => o.id === "b")?.pricePerReferenceCents).toBe(640);
  });

  it("compara g com kg", () => {
    const result = compareOptions([
      { id: "g", name: "Pacote 500 g", priceCents: 400, packageSize: 500, packageUnit: "g", packagesCount: 1 },
      { id: "kg", name: "Pacote 1 kg", priceCents: 750, packageSize: 1, packageUnit: "kg", packagesCount: 1 },
    ]);
    expect(result.ok && result.bestValueId).toBe("kg");
  });

  it("compara ml com L", () => {
    const result = compareOptions([
      { id: "lata", name: "Lata", priceCents: 349, packageSize: 350, packageUnit: "ml", packagesCount: 6 },
      { id: "garrafa", name: "Garrafa", priceCents: 899, packageSize: 2, packageUnit: "L", packagesCount: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bestValueId).toBe("lata");
    expect(result.group).toBe("volume");
  });

  it("não compara peso com volume (regra 10)", () => {
    const result = compareOptions([arrozA, { ...arrozB, id: "c", packageUnit: "L" }]);
    expect(result).toEqual({ ok: false, reason: "incompatible_units", groups: ["weight", "volume"] });
  });

  it("não compara peso com unidade", () => {
    const result = compareOptions([arrozA, { ...arrozB, id: "c", packageUnit: "unidade" }]);
    expect(result.ok).toBe(false);
  });

  it("exige pelo menos duas opções", () => {
    expect(compareOptions([arrozA])).toEqual({ ok: false, reason: "not_enough_options" });
  });

  it("aceita mais de duas opções", () => {
    const result = compareOptions([
      arrozA,
      arrozB,
      { id: "c", name: "Produto C", priceCents: 1350, packageSize: 2, packageUnit: "kg", packagesCount: 1 },
    ]);
    expect(result.ok && result.bestValueId).toBe("b");
    // maior = 750 (A), menor = 640 (B)
    expect(result.ok && result.savingsPercent).toBe(14.67);
  });
});
