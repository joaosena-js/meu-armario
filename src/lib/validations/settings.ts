import { z } from "zod";

import { THEMES } from "@/lib/constants/domain";

export const settingsSchema = z.object({
  fullName: z.string().trim().min(2, { error: "Informe seu nome." }).max(120),
  automaticallyAddOutOfStock: z.boolean(),
  automaticallyAddLowStock: z.boolean(),
  theme: z.enum(THEMES),
});

export type SettingsInput = z.input<typeof settingsSchema>;
