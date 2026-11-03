import "server-only";

import { PRIORITY_WEIGHT } from "@/lib/constants/domain";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingListView } from "@/types/domain";

export async function listPendingShoppingItems(): Promise<ShoppingListView[]> {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Não foi possível carregar a lista.", { cause: error });
  if (!items?.length) return [];

  const productIds = items.flatMap((i) => (i.product_id ? [i.product_id] : []));

  const [products, categories, inventory, lastPurchases, stats] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id, name, brand, category_id").in("id", productIds)
      : Promise.resolve({ data: [] }),
    supabase.from("categories").select("id, name"),
    productIds.length
      ? supabase.from("inventory_items").select("product_id, package_size, package_unit").in("product_id", productIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("product_last_purchase").select("*").in("product_id", productIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("product_price_stats").select("*").in("product_id", productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productById = new Map((products.data ?? []).map((p) => [p.id, p]));
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const inventoryByProduct = new Map((inventory.data ?? []).map((i) => [i.product_id, i]));
  const lastByProduct = new Map((lastPurchases.data ?? []).map((l) => [l.product_id, l]));

  const result: ShoppingListView[] = items.map((item) => {
    const product = item.product_id ? productById.get(item.product_id) : undefined;
    const last = item.product_id ? (lastByProduct.get(item.product_id) ?? null) : null;
    // Menor preço na mesma unidade de referência da última compra
    const lowest = last
      ? (stats.data ?? []).find((s) => s.product_id === item.product_id && s.normalized_unit === last.normalized_unit)
      : undefined;
    const inv = item.product_id ? inventoryByProduct.get(item.product_id) : undefined;

    return {
      ...item,
      displayName: product?.name ?? item.custom_name ?? "Produto",
      brand: item.preferred_brand ?? product?.brand ?? null,
      categoryName: product?.category_id ? (categoryById.get(product.category_id) ?? null) : null,
      lastPurchase: last,
      lowestNormalizedPrice: lowest ? { price: lowest.min_normalized_unit_price, unit: lowest.normalized_unit } : null,
      packageSize: inv?.package_size ?? null,
      packageUnit: inv?.package_unit ?? null,
    };
  });

  return result.sort(
    (a, b) =>
      PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
      a.displayName.localeCompare(b.displayName, "pt-BR"),
  );
}
