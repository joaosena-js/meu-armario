"use server";

import { revalidatePath } from "next/cache";

import { centsToReais } from "@/lib/calculations/money";
import { databaseErrorMessage, failure, validationFailure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { imagePathFromUrl, removeProductImage, uploadProductImage } from "@/lib/storage/product-images";
import { createClient } from "@/lib/supabase/server";
import { createProductSchema, updateProductSchema } from "@/lib/validations/product";
import type { ActionResult, InventoryChangeResult } from "@/types/domain";

type CreateProductResult = InventoryChangeResult & { product_id: string; purchase_id: string | null };

function readPayload(formData: FormData): unknown {
  const raw = formData.get("data");
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readImage(formData: FormData) {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

/**
 * Cadastro de produto. A gravação de produto, armário, compra, item da
 * compra e histórico acontece em uma única função SQL (transação).
 */
export async function createProductAction(formData: FormData): Promise<ActionResult<CreateProductResult>> {
  const user = await requireUser();
  const parsed = createProductSchema.safeParse(readPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const data = parsed.data;

  const supabase = await createClient();
  const image = readImage(formData);
  let uploadedPath: string | null = null;
  let imageUrl: string | null = null;

  if (image) {
    const upload = await uploadProductImage(supabase, user.id, image);
    if (!upload.ok) return failure(upload.error, { image: [upload.error] });
    uploadedPath = upload.path;
    imageUrl = upload.url;
  }

  const { data: result, error } = await supabase.rpc("create_product_with_inventory", {
    p_payload: {
      name: data.name,
      brand: data.brand,
      description: data.description,
      barcode: data.barcode,
      image_url: imageUrl,
      category_id: data.categoryId,
      storage_location_id: data.storageLocationId,
      current_quantity: data.currentQuantity,
      minimum_quantity: data.minimumQuantity,
      control_unit: data.controlUnit,
      package_size: data.packageSize,
      package_unit: data.packageUnit,
      units_per_package: data.unitsPerPackage,
      expiration_date: data.expirationDate,
      notes: data.notes,
      purchase: data.purchase
        ? {
            store_id: data.purchase.storeId,
            purchase_date: data.purchase.purchaseDate,
            unit_price: centsToReais(data.purchase.unitPriceCents),
            packages_count: data.purchase.packagesCount,
          }
        : null,
    },
  });

  if (error) {
    // Sem registro no banco, a foto enviada não deve ficar órfã
    if (uploadedPath) await removeProductImage(supabase, uploadedPath);
    return failure(databaseErrorMessage(error));
  }

  revalidatePath("/", "layout");
  return { ok: true, data: result as unknown as CreateProductResult, message: "Produto cadastrado." };
}

export async function updateProductAction(formData: FormData): Promise<ActionResult<InventoryChangeResult | null>> {
  const user = await requireUser();
  const parsed = updateProductSchema.safeParse(readPayload(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const data = parsed.data;
  const removeImage = formData.get("removeImage") === "true";

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("inventory_items")
    .select("id, product_id, current_quantity")
    .eq("id", data.inventoryItemId)
    .eq("product_id", data.productId)
    .maybeSingle();
  if (!current) return failure("Produto não encontrado.");

  const { data: product } = await supabase.from("products").select("image_url").eq("id", data.productId).single();
  const previousImagePath = imagePathFromUrl(product?.image_url ?? null);

  let imageUrl = removeImage ? null : (product?.image_url ?? null);
  let uploadedPath: string | null = null;
  const image = readImage(formData);
  if (image) {
    const upload = await uploadProductImage(supabase, user.id, image);
    if (!upload.ok) return failure(upload.error, { image: [upload.error] });
    uploadedPath = upload.path;
    imageUrl = upload.url;
  }

  const productUpdate = await supabase
    .from("products")
    .update({
      name: data.name,
      brand: data.brand,
      description: data.description,
      barcode: data.barcode,
      category_id: data.categoryId,
      image_url: imageUrl,
    })
    .eq("id", data.productId);

  if (productUpdate.error) {
    if (uploadedPath) await removeProductImage(supabase, uploadedPath);
    return failure(databaseErrorMessage(productUpdate.error));
  }

  const inventoryUpdate = await supabase
    .from("inventory_items")
    .update({
      storage_location_id: data.storageLocationId,
      minimum_quantity: data.minimumQuantity,
      control_unit: data.controlUnit,
      package_size: data.packageSize,
      package_unit: data.packageSize === null ? null : data.packageUnit,
      units_per_package: data.unitsPerPackage,
      expiration_date: data.expirationDate,
      notes: data.notes,
    })
    .eq("id", data.inventoryItemId);
  if (inventoryUpdate.error) return failure(databaseErrorMessage(inventoryUpdate.error));

  // A quantidade passa pela função de estoque para aplicar a regra da lista
  let change: InventoryChangeResult | null = null;
  if (Number(current.current_quantity) !== data.currentQuantity) {
    const { data: result, error } = await supabase.rpc("set_inventory_quantity", {
      p_item_id: data.inventoryItemId,
      p_quantity: data.currentQuantity,
    });
    if (error) return failure(databaseErrorMessage(error));
    change = result as unknown as InventoryChangeResult;
  }

  if (previousImagePath && imageUrl !== product?.image_url) {
    await removeProductImage(supabase, previousImagePath);
  }

  revalidatePath("/", "layout");
  return { ok: true, data: change, message: "Produto atualizado." };
}
