"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { databaseErrorMessage, failure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, AddToListResult, InventoryChangeResult } from "@/types/domain";

const idSchema = z.uuid();
const deltaSchema = z.number().finite().min(-99999).max(99999);

function revalidateInventory() {
  revalidatePath("/", "layout");
}

export async function adjustQuantityAction(itemId: string, delta: number): Promise<ActionResult<InventoryChangeResult>> {
  await requireUser();
  if (!idSchema.safeParse(itemId).success || !deltaSchema.safeParse(delta).success) return failure("Dados inválidos.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_inventory_quantity", { p_item_id: itemId, p_delta: delta });
  if (error) return failure(databaseErrorMessage(error));
  revalidateInventory();
  return { ok: true, data: data as unknown as InventoryChangeResult };
}

export async function setQuantityAction(itemId: string, quantity: number): Promise<ActionResult<InventoryChangeResult>> {
  await requireUser();
  if (!idSchema.safeParse(itemId).success || !z.number().min(0).max(99999).safeParse(quantity).success) {
    return failure("Quantidade inválida.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_inventory_quantity", { p_item_id: itemId, p_quantity: quantity });
  if (error) return failure(databaseErrorMessage(error));
  revalidateInventory();
  return { ok: true, data: data as unknown as InventoryChangeResult };
}

export async function markOutOfStockAction(itemId: string) {
  return setQuantityAction(itemId, 0);
}

export async function markLowStockAction(itemId: string): Promise<ActionResult<InventoryChangeResult>> {
  await requireUser();
  if (!idSchema.safeParse(itemId).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_inventory_low_stock", { p_item_id: itemId });
  if (error) return failure(databaseErrorMessage(error));
  revalidateInventory();
  return { ok: true, data: data as unknown as InventoryChangeResult };
}

export async function addProductToListAction(
  productId: string,
  reason: "manual" | "out_of_stock" | "low_stock" = "manual",
): Promise<ActionResult<AddToListResult>> {
  await requireUser();
  if (!idSchema.safeParse(productId).success) return failure("Dados inválidos.");
  if (!["manual", "out_of_stock", "low_stock"].includes(reason)) return failure("Motivo inválido.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_product_to_shopping_list", {
    p_product_id: productId,
    p_reason: reason,
    p_priority: reason === "out_of_stock" ? "high" : "normal",
  });
  if (error) return failure(databaseErrorMessage(error));
  revalidateInventory();
  const result = data as unknown as AddToListResult;
  return {
    ok: true,
    data: result,
    message: result.created ? "Adicionado à lista Tem que comprar." : "Este produto já está na lista Tem que comprar.",
  };
}

/** Remove o item do armário. O produto continua no catálogo por causa do histórico. */
export async function deleteInventoryItemAction(itemId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(itemId).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("inventory_items").delete({ count: "exact" }).eq("id", itemId);
  if (error) return failure(databaseErrorMessage(error));
  if (!count) return failure("Produto não encontrado.");
  revalidateInventory();
  return { ok: true, data: undefined, message: "Produto removido do armário." };
}
