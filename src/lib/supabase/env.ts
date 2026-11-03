/**
 * Variáveis públicas do Supabase. A chave publicável pode ir para o
 * navegador porque o acesso aos dados é controlado pelo RLS.
 * A service role key NUNCA deve ser usada neste projeto.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local (veja .env.example).",
    );
  }

  return { url, publishableKey };
}
