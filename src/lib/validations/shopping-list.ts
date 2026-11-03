import { z } from "zod";

import { CONTROL_UNITS, PRIORITIES } from "@/lib/constants/domain";
import { decimalField, optionalText, optionalUuid } from "./common";

export const addShoppingItemSchema = z
  .object({
    productId: optionalUuid,
    customName: optionalText(120, "Nome"),
    preferredBrand: optionalText(80, "Marca preferida"),
    desiredQuantity: decimalField({ label: "Quantidade", positive: true, max: 9999 }),
    unit: z.enum(CONTROL_UNITS),
    priority: z.enum(PRIORITIES),
    notes: optionalText(300, "Observação"),
  })
  .superRefine((data, ctx) => {
    if (!data.productId && !data.customName) {
      ctx.addIssue({ code: "custom", path: ["customName"], message: "Escolha um produto ou digite um nome." });
    }
  });

export const updateShoppingItemSchema = z.object({
  id: z.uuid(),
  desiredQuantity: decimalField({ label: "Quantidade", positive: true, max: 9999 }),
  priority: z.enum(PRIORITIES),
  notes: optionalText(300, "Observação"),
});

export type AddShoppingItemInput = z.input<typeof addShoppingItemSchema>;
export type UpdateShoppingItemInput = z.input<typeof updateShoppingItemSchema>;
