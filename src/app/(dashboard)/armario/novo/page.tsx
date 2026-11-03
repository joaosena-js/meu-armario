import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { getCatalogOptions } from "@/lib/queries/catalog";

export const metadata: Metadata = { title: "Cadastrar produto" };

export default async function NewProductPage() {
  const catalog = await getCatalogOptions();
  return (
    <>
      <PageHeader title="Cadastrar produto" backHref="/armario" backLabel="Meu Armário" className="mx-auto max-w-2xl" />
      <ProductForm mode="create" catalog={catalog} />
    </>
  );
}
