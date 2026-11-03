import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};

/**
 * Lê o usuário da sessão (JWT verificado pelo Supabase) uma única vez por
 * requisição. Data Access Layer: toda leitura de dados parte daqui.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.claims.sub).maybeSingle();

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    fullName: profile?.full_name ?? null,
  };
});

/** Use em páginas e actions privadas. Redireciona para o login sem sessão. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
