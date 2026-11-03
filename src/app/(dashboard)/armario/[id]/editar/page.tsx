import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { getCatalogOptions } from "@/lib/queries/catalog";
import { getInventoryItem } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: PageProps<"/armario/[id]/editar">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [details, catalog] = await Promise.all([getInventoryItem(id), getCatalogOptions()]);
  if (!details) notFound();
  const { item, product } = details;

  return (
    <>
      <PageHeader title={`Editar ${product.name}`} backHref={`/armario/${id}`} className="mx-auto max-w-2xl" />
      <ProductForm
        mode="edit"
        catalog={catalog}
        defaults={{
          inventoryItemId: item.id,
          productId: product.id,
          imageUrl: product.image_url,
          name: product.name,
          brand: product.brand ?? "",
          categoryId: product.category_id ?? "",
          description: product.description ?? "",
          barcode: product.barcode ?? "",
          storageLocationId: item.storage_location_id ?? "",
          currentQuantity: String(Number(item.current_quantity)).replace(".", ","),
          minimumQuantity: String(Number(item.minimum_quantity)).replace(".", ","),
          controlUnit: item.control_unit,
          packageSize: item.package_size === null ? "" : String(Number(item.package_size)).replace(".", ","),
          packageUnit: item.package_unit ?? "",
          unitsPerPackage: String(item.units_per_package),
          expirationDate: item.expiration_date ?? "",
          notes: item.notes ?? "",
        }}
      />
    </>
  );
}
