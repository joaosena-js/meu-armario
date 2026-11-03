import type { Tables, Views } from "./database";

/** Retorno das funções de estoque (set/adjust/mark). */
export type InventoryChangeResult = {
  inventory_item_id: string;
  status: Tables<"inventory_items">["status"];
  previous_status: Tables<"inventory_items">["status"];
  current_quantity: number;
  added_to_list: boolean;
  already_in_list: boolean;
  ask_to_add: boolean;
};

export type AddToListResult = { item_id: string; created: boolean };

export type FinalizePurchaseItemSummary = {
  product_id: string;
  name: string;
  brand: string | null;
  packages_count: number;
  total_price: number;
  normalized_unit: "kg" | "L" | "unidade";
  normalized_unit_price: number;
  previous_normalized_unit_price: number | null;
  price_change: "higher" | "lower" | "equal" | null;
};

export type FinalizePurchaseResult = {
  purchase_id: string;
  total_amount: number;
  items_count: number;
  items: FinalizePurchaseItemSummary[];
};

/** Item do armário pronto para exibição. */
export type InventoryView = Tables<"inventory_items"> & {
  product: Pick<Tables<"products">, "id" | "name" | "brand" | "image_url" | "description" | "barcode" | "category_id">;
  category: Pick<Tables<"categories">, "id" | "name" | "color"> | null;
  location: Pick<Tables<"storage_locations">, "id" | "name"> | null;
  lastPurchase: Views<"product_last_purchase"> | null;
  inShoppingList: boolean;
};

export type ShoppingListView = Tables<"shopping_list_items"> & {
  displayName: string;
  brand: string | null;
  categoryName: string | null;
  lastPurchase: Views<"product_last_purchase"> | null;
  lowestNormalizedPrice: { price: number; unit: "kg" | "L" | "unidade" } | null;
  packageSize: number | null;
  packageUnit: Tables<"inventory_items">["package_unit"];
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
