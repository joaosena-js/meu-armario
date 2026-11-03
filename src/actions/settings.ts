"use server";

import { revalidatePath } from "next/cache";

import { databaseErrorMessage, failure, validationFailure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";
import type { ActionResult } from "@/types/domain";

export async function updateSettingsAction(input: SettingsInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();

  const [profile, settings] = await Promise.all([
    supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", user.id),
    supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        automatically_add_out_of_stock: parsed.data.automaticallyAddOutOfStock,
        automatically_add_low_stock: parsed.data.automaticallyAddLowStock,
        theme: parsed.data.theme,
      },
      { onConflict: "user_id" },
    ),
  ]);

  const error = profile.error ?? settings.error;
  if (error) return failure(databaseErrorMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Configurações salvas." };
}
