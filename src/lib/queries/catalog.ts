import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CatalogOptions = {
  categories: Pick<Tables<"categories">, "id" | "name" | "color">[];
  locations: Pick<Tables<"storage_locations">, "id" | "name">[];
  stores: Pick<Tables<"stores">, "id" | "name">[];
};

export async function getCatalogOptions(): Promise<CatalogOptions> {
  const supabase = await createClient();
  const [categories, locations, stores] = await Promise.all([
    supabase.from("categories").select("id, name, color").order("name"),
    supabase.from("storage_locations").select("id, name").order("name"),
    supabase.from("stores").select("id, name").order("name"),
  ]);
  return {
    categories: categories.data ?? [],
    locations: locations.data ?? [],
    stores: stores.data ?? [],
  };
}

export type ProductOption = {
  id: string;
  name: string;
  brand: string | null;
  unit: Tables<"inventory_items">["control_unit"];
};

/** Produtos já cadastrados, para adicionar à lista. */
export async function getProductOptions(): Promise<ProductOption[]> {
  const supabase = await createClient();
  const [products, inventory] = await Promise.all([
    supabase.from("products").select("id, name, brand").order("name"),
    supabase.from("inventory_items").select("product_id, control_unit"),
  ]);
  const units = new Map((inventory.data ?? []).map((i) => [i.product_id, i.control_unit]));
  return (products.data ?? []).map((p) => ({ ...p, unit: units.get(p.id) ?? "unidade" }));
}
