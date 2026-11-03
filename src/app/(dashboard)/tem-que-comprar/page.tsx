import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { getProductOptions } from "@/lib/queries/catalog";
import { listPendingShoppingItems } from "@/lib/queries/shopping-list";

export const metadata: Metadata = { title: "Tem que comprar" };

export default async function ShoppingListPage() {
  const [items, products] = await Promise.all([listPendingShoppingItems(), getProductOptions()]);
  return (
    <>
      <PageHeader
        title="Tem que comprar"
        description={items.length === 1 ? "1 item pendente" : `${items.length} itens pendentes`}
      />
      <ShoppingList items={items} products={products} />
    </>
  );
}
