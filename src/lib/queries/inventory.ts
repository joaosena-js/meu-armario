import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StockStatus } from "@/lib/constants/domain";
import type { Tables, Views } from "@/types/database";
import type { InventoryView } from "@/types/domain";

export type InventorySort = "name" | "quantity" | "updated";

export type InventoryFilters = {
  q?: string;
  category?: string;
  status?: StockStatus | "";
  sort?: InventorySort;
};

/**
 * Carrega o armário com consultas simples em paralelo e junta os dados em
 * memória. Para o volume de um estoque doméstico isso é rápido e evita
 * consultas aninhadas difíceis de manter. O RLS garante que só venham
 * dados do usuário logado.
 */
async function loadInventory(): Promise<InventoryView[]> {
  const supabase = await createClient();

  const [inventory, products, categories, locations, lastPurchases, pending] = await Promise.all([
    supabase.from("inventory_items").select("*"),
    supabase.from("products").select("id, name, brand, image_url, description, barcode, category_id"),
    supabase.from("categories").select("id, name, color"),
    supabase.from("storage_locations").select("id, name"),
    supabase.from("product_last_purchase").select("*"),
    supabase.from("shopping_list_items").select("product_id").eq("status", "pending").not("product_id", "is", null),
  ]);

  const error = inventory.error ?? products.error;
  if (error) throw new Error("Não foi possível carregar o armário.", { cause: error });

  const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c]));
  const locationById = new Map((locations.data ?? []).map((l) => [l.id, l]));
  const lastByProduct = new Map((lastPurchases.data ?? []).map((l) => [l.product_id, l]));
  const pendingProducts = new Set((pending.data ?? []).map((p) => p.product_id));

  return (inventory.data ?? []).flatMap((item) => {
    const product = productById.get(item.product_id);
    if (!product) return [];
    return [
      {
        ...item,
        product,
        category: product.category_id ? (categoryById.get(product.category_id) ?? null) : null,
        location: item.storage_location_id ? (locationById.get(item.storage_location_id) ?? null) : null,
        lastPurchase: lastByProduct.get(item.product_id) ?? null,
        inShoppingList: pendingProducts.has(item.product_id),
      },
    ];
  });
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export async function listInventory(filters: InventoryFilters = {}) {
  const all = await loadInventory();
  const q = filters.q ? normalizeSearch(filters.q) : "";

  const filtered = all.filter((item) => {
    if (filters.category && item.product.category_id !== filters.category) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (q) {
      const haystack = normalizeSearch(`${item.product.name} ${item.product.brand ?? ""} ${item.product.barcode ?? ""}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const sort = filters.sort ?? "name";
  filtered.sort((a, b) => {
    if (sort === "quantity") return Number(a.current_quantity) - Number(b.current_quantity) || a.product.name.localeCompare(b.product.name, "pt-BR");
    if (sort === "updated") return b.updated_at.localeCompare(a.updated_at);
    return a.product.name.localeCompare(b.product.name, "pt-BR");
  });

  return { items: filtered, total: all.length };
}

export type PriceHistoryEntry = Tables<"purchase_items"> & { purchase_date: string; store_name: string };

export async function getInventoryItem(id: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("inventory_items").select("*").eq("id", id).maybeSingle();
  if (!item) return null;

  const [product, location, history, stats, pending] = await Promise.all([
    supabase.from("products").select("*").eq("id", item.product_id).single(),
    item.storage_location_id
      ? supabase.from("storage_locations").select("id, name").eq("id", item.storage_location_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("purchase_items")
      .select("*")
      .eq("product_id", item.product_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("product_price_stats").select("*").eq("product_id", item.product_id),
    supabase
      .from("shopping_list_items")
      .select("id")
      .eq("product_id", item.product_id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (!product.data) return null;

  const purchaseIds = Array.from(new Set((history.data ?? []).map((h) => h.purchase_id)));
  const purchases = purchaseIds.length
    ? await supabase.from("purchases").select("id, purchase_date, store_id").in("id", purchaseIds)
    : { data: [] as { id: string; purchase_date: string; store_id: string }[] };
  const storeIds = Array.from(new Set((purchases.data ?? []).map((p) => p.store_id)));
  const stores = storeIds.length
    ? await supabase.from("stores").select("id, name").in("id", storeIds)
    : { data: [] as { id: string; name: string }[] };

  const purchaseById = new Map((purchases.data ?? []).map((p) => [p.id, p]));
  const storeById = new Map((stores.data ?? []).map((s) => [s.id, s.name]));

  const priceHistory: PriceHistoryEntry[] = (history.data ?? [])
    .map((h) => {
      const purchase = purchaseById.get(h.purchase_id);
      return {
        ...h,
        purchase_date: purchase?.purchase_date ?? h.created_at.slice(0, 10),
        store_name: purchase ? (storeById.get(purchase.store_id) ?? "") : "",
      };
    })
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date) || b.created_at.localeCompare(a.created_at));

  const category = product.data.category_id
    ? (await supabase.from("categories").select("id, name, color").eq("id", product.data.category_id).maybeSingle()).data
    : null;

  return {
    item,
    product: product.data,
    category,
    location: location.data,
    priceHistory,
    priceStats: (stats.data ?? []) as Views<"product_price_stats">[],
    inShoppingList: Boolean(pending.data),
  };
}
