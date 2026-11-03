import { describe, expect, it } from "vitest";

import { normalizePrice, pricePerKg, pricePerLiter, pricePerUnit, savingsPercent } from "../price";

describe("preço por kg", () => {
  it("Produto A: R$ 7,50 em 1 kg = R$ 7,50 por kg", () => {
    expect(pricePerKg(750, 1, "kg")).toBe(750);
  });

  it("Produto B: R$ 32,00 em 5 kg = R$ 6,40 por kg", () => {
    expect(pricePerKg(3200, 5, "kg")).toBe(640);
  });

  it("converte gramas: R$ 4,99 em 500 g = R$ 9,98 por kg", () => {
    expect(pricePerKg(499, 500, "g")).toBe(998);
  });

  it("considera a quantidade de embalagens", () => {
    // 2 pacotes de 500 g por R$ 10,00 no total = 1 kg por R$ 10,00
    expect(pricePerKg(1000, 500, "g", 2)).toBe(1000);
  });

  it("arredonda somente no final", () => {
    // R$ 10,00 em 3 kg = R$ 3,333... => R$ 3,33
    const result = normalizePrice({ priceCents: 1000, packageSize: 3, packageUnit: "kg", packagesCount: 1 });
    expect(result.pricePerReferenceExact).toBeCloseTo(333.3333, 3);
    expect(result.pricePerReferenceCents).toBe(333);
  });
});

describe("preço por litro", () => {
  it("R$ 8,99 em 2 L = R$ 4,50 por litro", () => {
    expect(pricePerLiter(899, 2, "L")).toBe(450);
  });

  it("R$ 2,99 em 500 ml = R$ 5,98 por litro", () => {
    expect(pricePerLiter(299, 500, "ml")).toBe(598);
  });

  it("R$ 3,49 em 350 ml x 6 latas = R$ 1,66 por litro", () => {
    // 349 * 1000 / 2100 = 166,19
    expect(pricePerLiter(349, 350, "ml", 6)).toBe(166);
  });
});

describe("preço por unidade", () => {
  it("R$ 12,00 por 12 unidades = R$ 1,00 por unidade", () => {
    expect(pricePerUnit(1200, 12)).toBe(100);
  });

  it("R$ 19,90 por 2 pacotes com 4 unidades = R$ 2,49 por unidade", () => {
    // 1990 / 8 = 248,75
    expect(pricePerUnit(1990, 4, 2)).toBe(249);
  });

  it("normaliza a unidade de referência", () => {
    const result = normalizePrice({ priceCents: 1200, packageSize: 12, packageUnit: "unidade", packagesCount: 1 });
    expect(result.referenceUnit).toBe("unidade");
    expect(result.group).toBe("count");
  });
});

describe("validação de entrada", () => {
  it("rejeita embalagem zerada ou negativa", () => {
    expect(() => normalizePrice({ priceCents: 100, packageSize: 0, packageUnit: "kg", packagesCount: 1 })).toThrow();
    expect(() => normalizePrice({ priceCents: 100, packageSize: -1, packageUnit: "kg", packagesCount: 1 })).toThrow();
  });

  it("rejeita quantidade de embalagens inválida", () => {
    expect(() => normalizePrice({ priceCents: 100, packageSize: 1, packageUnit: "kg", packagesCount: 0 })).toThrow();
    expect(() => normalizePrice({ priceCents: 100, packageSize: 1, packageUnit: "kg", packagesCount: 1.5 })).toThrow();
  });

  it("rejeita preço negativo", () => {
    expect(() => normalizePrice({ priceCents: -1, packageSize: 1, packageUnit: "kg", packagesCount: 1 })).toThrow();
  });
});

describe("percentual de economia", () => {
  it("exemplo da especificação: 14,67%", () => {
    expect(savingsPercent(750, 640)).toBe(14.67);
  });

  it("preços iguais não têm economia", () => {
    expect(savingsPercent(500, 500)).toBe(0);
  });

  it("metade do preço = 50%", () => {
    expect(savingsPercent(1000, 500)).toBe(50);
  });

  it("evita divisão por zero", () => {
    expect(savingsPercent(0, 0)).toBe(0);
  });
});
