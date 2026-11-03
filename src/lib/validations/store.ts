import { z } from "zod";

import { optionalText, requiredText } from "./common";

export const storeSchema = z.object({
  name: requiredText(80, "Nome do mercado"),
  address: optionalText(200, "Endereço"),
  neighborhood: optionalText(80, "Bairro"),
  city: optionalText(80, "Cidade"),
  notes: optionalText(500, "Observações"),
});

export type StoreInput = z.input<typeof storeSchema>;
