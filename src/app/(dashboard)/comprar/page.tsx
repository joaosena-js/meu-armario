import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { MarketMode } from "@/components/shopping/market-mode";
import { requireUser } from "@/lib/queries/auth";
import { getCatalogOptions } from "@/lib/queries/catalog";
import { listPendingShoppingItems } from "@/lib/queries/shopping-list";

export const metadata: Metadata = { title: "Comprar" };

export default async function ShoppingModePage({ searchParams }: PageProps<"/comprar">) {
  const [user, items, catalog, params] = await Promise.all([
    requireUser(),
    listPendingShoppingItems(),
    getCatalogOptions(),
    searchParams,
  ]);
  const preselected = typeof params.itens === "string" ? params.itens.split(",").slice(0, 200) : [];

  return (
    <>
      <PageHeader title="Comprar" description="Modo mercado: registre preços e finalize para atualizar o armário." />
      <MarketMode userId={user.id} items={items} stores={catalog.stores} preselectedIds={preselected} />
    </>
  );
}
