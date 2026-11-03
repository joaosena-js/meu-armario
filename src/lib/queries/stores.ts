import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables, Views } from "@/types/database";

export type StoreWithStats = Tables<"stores"> & { stats: Views<"store_stats"> | null };

export async function listStores(): Promise<StoreWithStats[]> {
  const supabase = await createClient();
  const [stores, stats] = await Promise.all([
    supabase.from("stores").select("*").order("name"),
    supabase.from("store_stats").select("*"),
  ]);
  if (stores.error) throw new Error("Não foi possível carregar os mercados.", { cause: stores.error });
  const statsById = new Map((stats.data ?? []).map((s) => [s.store_id, s]));
  return (stores.data ?? []).map((store) => ({ ...store, stats: statsById.get(store.id) ?? null }));
}

export async function getStoreDetails(id: string) {
  const supabase = await createClient();
  const { data: store } = await supabase.from("stores").select("*").eq("id", id).maybeSingle();
  if (!store) return null;

  const [stats, prices, recentPurchases] = await Promise.all([
    supabase.from("store_stats").select("*").eq("store_id", id).maybeSingle(),
    supabase
      .from("store_product_prices")
      .select("*")
      .eq("store_id", id)
      .order("last_purchase_date", { ascending: false })
      .limit(30),
    supabase
      .from("purchases")
      .select("id, purchase_date, total_amount")
      .eq("store_id", id)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    store,
    stats: stats.data,
    productPrices: prices.data ?? [],
    recentPurchases: recentPurchases.data ?? [],
  };
}
