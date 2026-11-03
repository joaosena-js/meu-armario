"use server";

import { revalidatePath } from "next/cache";

import { centsToReais } from "@/lib/calculations/money";
import { databaseErrorMessage, failure, validationFailure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";
import { finalizePurchaseSchema, type FinalizePurchaseInput } from "@/lib/validations/purchase";
import type { ActionResult, FinalizePurchaseResult } from "@/types/domain";

/**
 * Finaliza a compra do modo mercado. O navegador envia somente preço por
 * embalagem, embalagem e quantidade; os totais são recalculados no banco
 * (regra 12) e o estoque só é alterado aqui (regra 8).
 */
export async function finalizePurchaseAction(input: FinalizePurchaseInput): Promise<ActionResult<FinalizePurchaseResult>> {
  await requireUser();
  const parsed = finalizePurchaseSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { storeId, purchaseDate, items } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finalize_purchase", {
    p_store_id: storeId,
    p_purchase_date: purchaseDate,
    p_items: items.map((item) => ({
      shopping_list_item_id: item.shoppingListItemId,
      product_id: item.productId,
      name: item.name,
      brand: item.brand,
      unit_price: centsToReais(item.unitPriceCents),
      package_size: item.packageSize,
      package_unit: item.packageSize === null ? null : item.packageUnit,
      units_per_package: 1,
      packages_count: item.packagesCount,
    })),
  });

  if (error) return failure(databaseErrorMessage(error));
  revalidatePath("/", "layout");
  return { ok: true, data: data as unknown as FinalizePurchaseResult, message: "Compra finalizada." };
}
