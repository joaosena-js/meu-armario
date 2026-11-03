import { describe, expect, it } from "vitest";

import { areUnitsCompatible, kgToGrams, litersToMilliliters, toBaseQuantity } from "../units";

describe("conversão de unidades", () => {
  it("converte kg para g (1 kg = 1.000 g)", () => {
    expect(kgToGrams(1)).toBe(1000);
    expect(kgToGrams(5)).toBe(5000);
    expect(kgToGrams(0.5)).toBe(500);
    // 0,1 x 1000 em ponto flutuante daria 100.00000000000001
    expect(kgToGrams(0.1)).toBe(100);
    expect(kgToGrams(1.005)).toBe(1005);
  });

  it("converte L para ml (1 L = 1.000 ml)", () => {
    expect(litersToMilliliters(1)).toBe(1000);
    expect(litersToMilliliters(2)).toBe(2000);
    expect(litersToMilliliters(0.35)).toBe(350);
    expect(litersToMilliliters(1.5)).toBe(1500);
  });

  it("mantém g, ml e unidade na própria base", () => {
    expect(toBaseQuantity(395, "g")).toBe(395);
    expect(toBaseQuantity(500, "ml")).toBe(500);
    expect(toBaseQuantity(12, "unidade")).toBe(12);
    expect(toBaseQuantity(2, "kg")).toBe(2000);
    expect(toBaseQuantity(2, "L")).toBe(2000);
  });

  it("só considera compatíveis unidades do mesmo grupo", () => {
    expect(areUnitsCompatible("g", "kg")).toBe(true);
    expect(areUnitsCompatible("ml", "L")).toBe(true);
    expect(areUnitsCompatible("unidade", "unidade")).toBe(true);
    expect(areUnitsCompatible("kg", "L")).toBe(false);
    expect(areUnitsCompatible("g", "unidade")).toBe(false);
    expect(areUnitsCompatible("ml", "unidade")).toBe(false);
  });
});
