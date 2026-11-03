import { z } from "zod";

import { PACKAGE_UNITS } from "@/lib/constants/domain";
import { decimalField, integerField, moneyField, optionalText } from "./common";

export const comparatorOptionSchema = z.object({
  name: z.string().trim().max(80),
  brand: optionalText(80, "Marca"),
  price: moneyField("Preço"),
  packageSize: decimalField({ label: "Peso, volume ou quantidade", positive: true, max: 999999 }),
  packageUnit: z.enum(PACKAGE_UNITS),
  packagesCount: integerField({ label: "Embalagens", min: 1, max: 999 }),
});

export const comparatorSchema = z.object({
  options: z.array(comparatorOptionSchema).min(2, { error: "Adicione pelo menos duas opções." }).max(10),
});

export type ComparatorFormInput = z.input<typeof comparatorSchema>;
