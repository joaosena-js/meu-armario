"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { databaseErrorMessage, failure, validationFailure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";
import {
  addShoppingItemSchema,
  updateShoppingItemSchema,
  type AddShoppingItemInput,
  type UpdateShoppingItemInput,
} from "@/lib/validations/shopping-list";
import type { ActionResult } from "@/types/domain";

const idSchema = z.uuid();

export async function addShoppingItemAction(input: AddShoppingItemInput): Promise<ActionResult> {
  await requireUser();
  const parsed = addShoppingItemSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const data = parsed.data;
  const supabase = await createClient();

  if (data.productId) {
    const { data: result, error } = await supabase.rpc("add_product_to_shopping_list", {
      p_product_id: data.productId,
      p_quantity: data.desiredQuantity,
      p_priority: data.priority,
      p_reason: "manual",
    });
    if (error) return failure(databaseErrorMessage(error));
    const created = (result as { created?: boolean } | null)?.created;
    if (!created) return failure("Este produto já está na lista. Altere a quantidade no item existente.");
    // Observação e marca não fazem parte da função; atualiza o item criado
    const itemId = (result as { item_id?: string }).item_id;
    if (itemId && (data.notes || data.preferredBrand || data.unit)) {
      await supabase
        .from("shopping_list_items")
        .update({ notes: data.notes, preferred_brand: data.preferredBrand, unit: data.unit })
        .eq("id", itemId);
    }
  } else {
    const { error } = await supabase.from("shopping_list_items").insert({
      custom_name: data.customName,
      preferred_brand: data.preferredBrand,
      desired_quantity: data.desiredQuantity,
      unit: data.unit,
      priority: data.priority,
      notes: data.notes,
      reason: "manual",
    });
    if (error) {
      if (error.code === "23505") return failure("Já existe um item pendente com esse nome na lista.");
      return failure(databaseErrorMessage(error));
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Item adicionado à lista." };
}

export async function updateShoppingItemAction(input: UpdateShoppingItemInput): Promise<ActionResult> {
  await requireUser();
  const parsed = updateShoppingItemSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("shopping_list_items")
    .update(
      {
        desired_quantity: parsed.data.desiredQuantity,
        priority: parsed.data.priority,
        notes: parsed.data.notes,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("status", "pending");
  if (error) return failure(databaseErrorMessage(error));
  if (!count) return failure("Item não encontrado.");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Item atualizado." };
}

export async function removeShoppingItemAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("shopping_list_items").delete({ count: "exact" }).eq("id", id);
  if (error) return failure(databaseErrorMessage(error));
  if (!count) return failure("Item não encontrado.");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Item removido da lista." };
}

export async function markShoppingItemPurchasedAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_shopping_item_purchased", { p_item_id: id });
  if (error) return failure(databaseErrorMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Marcado como comprado e somado ao armário." };
}

export async function repeatPurchaseAction(purchaseId: string): Promise<ActionResult<{ added: number; skipped: number }>> {
  await requireUser();
  if (!idSchema.safeParse(purchaseId).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("repeat_purchase_to_list", { p_purchase_id: purchaseId });
  if (error) return failure(databaseErrorMessage(error));
  const result = data as unknown as { added: number; skipped: number };
  revalidatePath("/", "layout");
  const parts = [`${result.added} ${result.added === 1 ? "produto adicionado" : "produtos adicionados"} à lista`];
  if (result.skipped) parts.push(`${result.skipped} já ${result.skipped === 1 ? "estava" : "estavam"} na lista`);
  return { ok: true, data: result, message: `${parts.join(", ")}.` };
}
