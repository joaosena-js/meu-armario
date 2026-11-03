import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type PurchaseFilters = { from?: string; to?: string; store?: string };

export type PurchaseListItem = Tables<"purchases"> & {
  storeName: string;
  itemsCount: number;
  productNames: string[];
};

export async function listPurchases(filters: PurchaseFilters = {}, limit = 100): Promise<PurchaseListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("purchases")
    .select("*")
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.from) query = query.gte("purchase_date", filters.from);
  if (filters.to) query = query.lte("purchase_date", filters.to);
  if (filters.store) query = query.eq("store_id", filters.store);

  const { data: purchases, error } = await query;
  if (error) throw new Error("Não foi possível carregar o histórico.", { cause: error });
  if (!purchases?.length) return [];

  const ids = purchases.map((p) => p.id);
  const [stores, items] = await Promise.all([
    supabase.from("stores").select("id, name"),
    supabase.from("purchase_items").select("purchase_id, product_id").in("purchase_id", ids),
  ]);
  const productIds = Array.from(new Set((items.data ?? []).map((i) => i.product_id)));
  const products = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [] as { id: string; name: string }[] };

  const storeById = new Map((stores.data ?? []).map((s) => [s.id, s.name]));
  const productById = new Map((products.data ?? []).map((p) => [p.id, p.name]));

  return purchases.map((purchase) => {
    const purchaseItems = (items.data ?? []).filter((i) => i.purchase_id === purchase.id);
    return {
      ...purchase,
      storeName: storeById.get(purchase.store_id) ?? "Mercado",
      itemsCount: purchaseItems.length,
      productNames: purchaseItems.map((i) => productById.get(i.product_id) ?? "Produto"),
    };
  });
}

export async function getPurchaseDetails(id: string) {
  const supabase = await createClient();
  const { data: purchase } = await supabase.from("purchases").select("*").eq("id", id).maybeSingle();
  if (!purchase) return null;

  const [store, items] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", purchase.store_id).maybeSingle(),
    supabase.from("purchase_items").select("*").eq("purchase_id", id).order("created_at"),
  ]);
  const productIds = Array.from(new Set((items.data ?? []).map((i) => i.product_id)));
  const [products, inventory] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    productIds.length
      ? supabase.from("inventory_items").select("id, product_id").in("product_id", productIds)
      : Promise.resolve({ data: [] as { id: string; product_id: string }[] }),
  ]);
  const productById = new Map((products.data ?? []).map((p) => [p.id, p.name]));
  const inventoryByProduct = new Map((inventory.data ?? []).map((i) => [i.product_id, i.id]));

  return {
    purchase,
    storeName: store.data?.name ?? "Mercado",
    items: (items.data ?? []).map((item) => ({
      ...item,
      productName: productById.get(item.product_id) ?? "Produto",
      inventoryItemId: inventoryByProduct.get(item.product_id) ?? null,
    })),
  };
}
