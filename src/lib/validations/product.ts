import { z } from "zod";

import { CONTROL_UNITS, PACKAGE_UNITS } from "@/lib/constants/domain";
import {
  decimalField,
  integerField,
  isoDateField,
  moneyField,
  optionalDecimalField,
  optionalIsoDate,
  optionalText,
  optionalUuid,
  requiredText,
} from "./common";

const productBaseFields = {
  name: requiredText(120, "Nome do produto"),
  brand: optionalText(80, "Marca"),
  categoryId: optionalUuid,
  description: optionalText(500, "Descrição"),
  barcode: optionalText(14, "Código de barras").refine((value) => value === null || /^\d{8,14}$/.test(value), {
    error: "O código de barras deve ter de 8 a 14 números.",
  }),
};

const inventoryFields = {
  storageLocationId: optionalUuid,
  currentQuantity: decimalField({ label: "Quantidade atual", min: 0, max: 99999 }),
  minimumQuantity: decimalField({ label: "Quantidade mínima", min: 0, max: 99999 }),
  controlUnit: z.enum(CONTROL_UNITS, { error: "Selecione a unidade de controle." }),
  packageSize: optionalDecimalField({ label: "Peso ou volume", positive: true, max: 999999 }),
  packageUnit: z.union([z.enum(PACKAGE_UNITS), z.literal("")]).transform((value) => (value === "" ? null : value)),
  unitsPerPackage: integerField({ label: "Unidades na embalagem", min: 1, max: 1000 }),
  expirationDate: optionalIsoDate("Data de validade"),
  notes: optionalText(500, "Observações"),
};

function refinePackage<T extends { packageSize: number | null; packageUnit: string | null }>(data: T, ctx: z.RefinementCtx) {
  if (data.packageSize !== null && !data.packageUnit) {
    ctx.addIssue({ code: "custom", path: ["packageUnit"], message: "Selecione a unidade da embalagem." });
  }
  if (data.packageSize === null && data.packageUnit) {
    ctx.addIssue({ code: "custom", path: ["packageSize"], message: "Informe o peso ou volume da embalagem." });
  }
}

/** Cadastro completo (produto + armário + compra opcional). */
export const createProductSchema = z
  .object({
    ...productBaseFields,
    ...inventoryFields,
    registerPurchase: z.boolean(),
    purchasePrice: z.string().optional(),
    purchasePackages: z.string().optional(),
    storeId: optionalUuid,
    purchaseDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refinePackage(data, ctx);
  })
  .transform((data, ctx) => {
    if (!data.registerPurchase) return { ...data, purchase: null };

    const price = moneyField("Preço pago").safeParse(data.purchasePrice ?? "");
    if (!price.success) {
      ctx.addIssue({ code: "custom", path: ["purchasePrice"], message: price.error.issues[0].message });
    }
    const packages = integerField({ label: "Quantidade comprada", min: 1, max: 999 }).safeParse(data.purchasePackages ?? "1");
    if (!packages.success) {
      ctx.addIssue({ code: "custom", path: ["purchasePackages"], message: packages.error.issues[0].message });
    }
    if (!data.storeId) {
      ctx.addIssue({ code: "custom", path: ["storeId"], message: "Selecione o mercado da compra." });
    }
    const date = isoDateField("Data da compra").safeParse(data.purchaseDate ?? "");
    if (!date.success) {
      ctx.addIssue({ code: "custom", path: ["purchaseDate"], message: date.error.issues[0].message });
    }
    if (!price.success || !packages.success || !data.storeId || !date.success) return z.NEVER;

    return {
      ...data,
      purchase: {
        storeId: data.storeId,
        purchaseDate: date.data,
        unitPriceCents: price.data,
        packagesCount: packages.data,
      },
    };
  });

/** Edição de produto e do item do armário (sem compra). */
export const updateProductSchema = z
  .object({
    inventoryItemId: z.uuid(),
    productId: z.uuid(),
    ...productBaseFields,
    ...inventoryFields,
  })
  .superRefine((data, ctx) => refinePackage(data, ctx));

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductOutput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
