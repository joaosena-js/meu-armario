import { z } from "zod";

import { PACKAGE_UNITS } from "@/lib/constants/domain";
import { integerField, isoDateField, moneyField, optionalDecimalField, optionalText } from "./common";

/** Item do carrinho validado ao clicar em "Adicionar ao carrinho". */
export const cartItemSchema = z
  .object({
    unitPrice: moneyField("Preço encontrado"),
    brand: optionalText(80, "Marca"),
    packageSize: optionalDecimalField({ label: "Peso ou volume", positive: true, max: 999999 }),
    packageUnit: z.union([z.enum(PACKAGE_UNITS), z.literal("")]).transform((v) => (v === "" ? null : v)),
    packagesCount: integerField({ label: "Embalagens", min: 1, max: 999 }),
  })
  .superRefine((data, ctx) => {
    if (data.packageSize !== null && !data.packageUnit) {
      ctx.addIssue({ code: "custom", path: ["packageUnit"], message: "Selecione a unidade." });
    }
  });

export type CartItemInput = z.input<typeof cartItemSchema>;

/** Dados enviados ao servidor na finalização. */
export const finalizePurchaseSchema = z.object({
  storeId: z.uuid({ error: "Selecione o mercado." }),
  purchaseDate: isoDateField("Data da compra"),
  items: z
    .array(
      z.object({
        shoppingListItemId: z.uuid().nullable(),
        productId: z.uuid().nullable(),
        name: z.string().trim().min(1).max(120),
        brand: z.string().trim().max(80).nullable(),
        unitPriceCents: z.number().int().min(0).max(9_999_900),
        packageSize: z.number().positive().max(999999).nullable(),
        packageUnit: z.enum(PACKAGE_UNITS).nullable(),
        packagesCount: z.number().int().min(1).max(999),
      }),
    )
    .min(1, { error: "Adicione pelo menos um produto ao carrinho." })
    .max(200),
});

export type FinalizePurchaseInput = z.infer<typeof finalizePurchaseSchema>;

export const historyFilterSchema = z.object({
  from: z.union([isoDateField("Data inicial"), z.literal("")]).optional(),
  to: z.union([isoDateField("Data final"), z.literal("")]).optional(),
  store: z.union([z.uuid(), z.literal("")]).optional(),
});
