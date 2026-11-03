import { z } from "zod";

import { parseMoneyToCents } from "@/lib/calculations/money";

/** Texto opcional: string vazia vira null. */
export const optionalText = (max: number, label = "Campo") =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const requiredText = (max: number, label: string) =>
  z
    .string({ error: `Informe ${label.toLowerCase()}.` })
    .trim()
    .min(1, { error: `Informe ${label.toLowerCase()}.` })
    .max(max, { error: `${label} deve ter no máximo ${max} caracteres.` });

export const uuidSchema = z.uuid({ error: "Identificador inválido." });

export const optionalUuid = z
  .union([z.uuid({ error: "Seleção inválida." }), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

/** Lê "1,5" ou "1.5" e devolve número. */
export function parseDecimal(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

export const decimalField = (opts: { label: string; min?: number; max?: number; positive?: boolean; maxDecimals?: number }) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    const parsed = parseDecimal(value);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: `Informe ${opts.label.toLowerCase()} válida.` });
      return z.NEVER;
    }
    if (opts.positive && parsed <= 0) {
      ctx.addIssue({ code: "custom", message: `${opts.label} deve ser maior que zero.` });
      return z.NEVER;
    }
    if (opts.min !== undefined && parsed < opts.min) {
      ctx.addIssue({ code: "custom", message: `${opts.label} não pode ser menor que ${opts.min}.` });
      return z.NEVER;
    }
    if (opts.max !== undefined && parsed > opts.max) {
      ctx.addIssue({ code: "custom", message: `${opts.label} não pode ser maior que ${opts.max}.` });
      return z.NEVER;
    }
    const decimals = (String(parsed).split(".")[1] ?? "").length;
    if (decimals > (opts.maxDecimals ?? 3)) {
      ctx.addIssue({ code: "custom", message: `${opts.label} aceita no máximo ${opts.maxDecimals ?? 3} casas decimais.` });
      return z.NEVER;
    }
    return parsed;
  });

export const optionalDecimalField = (opts: Parameters<typeof decimalField>[0]) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
      const result = decimalField(opts).safeParse(value);
      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue({ code: "custom", message: issue.message }));
        return z.NEVER;
      }
      return result.data;
    });

export const integerField = (opts: { label: string; min: number; max: number }) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    const parsed = parseDecimal(value);
    if (parsed === null || !Number.isInteger(parsed)) {
      ctx.addIssue({ code: "custom", message: `${opts.label} deve ser um número inteiro.` });
      return z.NEVER;
    }
    if (parsed < opts.min || parsed > opts.max) {
      ctx.addIssue({ code: "custom", message: `${opts.label} deve estar entre ${opts.min} e ${opts.max}.` });
      return z.NEVER;
    }
    return parsed;
  });

/** Valor em reais digitado ("7,50") convertido para centavos. */
export const moneyField = (label = "Preço", maxCents = 9_999_900) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    const cents = typeof value === "number" ? Math.round(value * 100) : parseMoneyToCents(value);
    if (cents === null || !Number.isFinite(cents)) {
      ctx.addIssue({ code: "custom", message: `Informe ${label.toLowerCase()} válido. Exemplo: 7,50` });
      return z.NEVER;
    }
    if (cents < 0 || cents > maxCents) {
      ctx.addIssue({ code: "custom", message: `${label} fora do limite permitido.` });
      return z.NEVER;
    }
    return cents;
  });

/** Data no formato do input date (AAAA-MM-DD). */
export const isoDateField = (label = "Data") =>
  z
    .string({ error: `Informe ${label.toLowerCase()}.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `Informe ${label.toLowerCase()} válida.` })
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), { error: `${label} inválida.` });

export const optionalIsoDate = (label = "Data") =>
  z
    .union([isoDateField(label), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null));
