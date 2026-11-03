import { describe, expect, it } from "vitest";

import { formatCents, formatDate } from "@/lib/formatters";
import { parseMoneyToCents, sumCents, toCents } from "../money";

describe("valores monetários em centavos", () => {
  it("lê valores digitados no padrão brasileiro", () => {
    expect(parseMoneyToCents("7,50")).toBe(750);
    expect(parseMoneyToCents("R$ 32,00")).toBe(3200);
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("7.5")).toBe(750);
    expect(parseMoneyToCents("10")).toBe(1000);
  });

  it("rejeita valores inválidos", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("7,505")).toBeNull();
    expect(parseMoneyToCents("-3")).toBeNull();
  });

  it("soma sem erro de ponto flutuante", () => {
    // 0,1 + 0,2 em reais daria 0,30000000000000004
    expect(sumCents([toCents(0.1), toCents(0.2)])).toBe(30);
  });

  it("formata como R$ 0,00", () => {
    expect(formatCents(750)).toBe("R$ 7,50");
    expect(formatCents(123456)).toBe("R$ 1.234,56");
    expect(formatCents(0)).toBe("R$ 0,00");
  });

  it("formata datas como DD/MM/AAAA sem deslocar o dia", () => {
    expect(formatDate("2026-11-03")).toBe("03/11/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });
});
