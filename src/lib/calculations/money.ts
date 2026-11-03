/**
 * Valores monetários são manipulados em centavos (inteiros) para evitar
 * erros de ponto flutuante, como 0,1 + 0,2 = 0,30000000000000004.
 */

export type Cents = number;

/** Converte um valor em reais vindo do banco (numeric) para centavos. */
export function toCents(reais: number | string | null | undefined): Cents {
  if (reais === null || reais === undefined || reais === "") return 0;
  if (typeof reais === "string") return parseMoneyToCents(reais) ?? 0;
  return Math.round(reais * 100);
}

/** Converte centavos para reais com duas casas, para enviar ao banco. */
export function centsToReais(cents: Cents): number {
  return Math.round(cents) / 100;
}

/**
 * Lê um valor digitado ("7,50", "1.234,56", "R$ 32", "7.5") e devolve
 * centavos, sem passar por multiplicação de ponto flutuante.
 * Retorna null quando o texto não é um valor válido.
 */
export function parseMoneyToCents(input: string): Cents | null {
  const cleaned = input.replace(/[R$\s]/g, "").trim();
  if (cleaned === "") return null;

  let normalized = cleaned;
  if (cleaned.includes(",")) {
    // Formato brasileiro: ponto como milhar e vírgula como decimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [integerPart, decimalPart = ""] = normalized.split(".");
  return Number(integerPart) * 100 + Number(decimalPart.padEnd(2, "0"));
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((total, value) => total + Math.round(value), 0);
}

export function multiplyCents(cents: Cents, quantity: number): Cents {
  return Math.round(cents * quantity);
}
