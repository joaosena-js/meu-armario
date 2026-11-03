import { describe, expect, it } from "vitest";

import { computeStockStatus } from "../stock-status";

describe("estado automático do estoque", () => {
  it("regra 1: quantidade zero = acabou", () => {
    expect(computeStockStatus(0, 2)).toBe("out_of_stock");
    expect(computeStockStatus(0, 0)).toBe("out_of_stock");
  });

  it("regra 2: maior que zero e menor ou igual ao mínimo = acabando", () => {
    expect(computeStockStatus(1, 2)).toBe("low_stock");
    expect(computeStockStatus(2, 2)).toBe("low_stock");
    expect(computeStockStatus(0.5, 1)).toBe("low_stock");
  });

  it("regra 3: maior que o mínimo = disponível", () => {
    expect(computeStockStatus(3, 2)).toBe("available");
    expect(computeStockStatus(1, 0)).toBe("available");
  });
});
