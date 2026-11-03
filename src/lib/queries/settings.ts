import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getUserSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("*").maybeSingle();
  return {
    automatically_add_out_of_stock: data?.automatically_add_out_of_stock ?? true,
    automatically_add_low_stock: data?.automatically_add_low_stock ?? false,
    theme: data?.theme ?? "system",
  };
}
