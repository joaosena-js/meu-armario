import { PackageOpen, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InventoryCard } from "@/components/inventory/inventory-card";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { STOCK_STATUSES, type StockStatus } from "@/lib/constants/domain";
import { getCatalogOptions } from "@/lib/queries/catalog";
import { listInventory, type InventorySort } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Meu Armário" };

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function InventoryPage({ searchParams }: PageProps<"/armario">) {
  const params = await searchParams;
  const status = param(params.status);
  const sort = param(params.ordem);
  const filters = {
    q: param(params.q)?.slice(0, 80),
    category: param(params.categoria),
    status: STOCK_STATUSES.includes(status as StockStatus) ? (status as StockStatus) : undefined,
    sort: (["name", "quantity", "updated"] as const).includes(sort as InventorySort) ? (sort as InventorySort) : undefined,
  };
  const view = param(params.vista) === "tabela" ? "tabela" : "cartoes";

  const [{ items, total }, catalog] = await Promise.all([listInventory(filters), getCatalogOptions()]);

  return (
    <>
      <PageHeader
        title="Meu Armário"
        description={total === 1 ? "1 produto cadastrado" : `${total} produtos cadastrados`}
        actions={
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/armario/novo">
              <Plus /> Cadastrar produto
            </Link>
          </Button>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Seu armário está vazio"
          description="Cadastre os produtos que você tem em casa para acompanhar o que está acabando."
          action={
            <Button asChild>
              <Link href="/armario/novo">Cadastrar o primeiro produto</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          <InventoryFilters categories={catalog.categories} />
          {items.length === 0 ? (
            <EmptyState icon={SearchX} title="Nenhum produto encontrado" description="Tente outra pesquisa ou limpe os filtros." />
          ) : (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {items.length === 1 ? "1 produto" : `${items.length} produtos`}
              </p>
              <div className={view === "tabela" ? "md:hidden" : undefined}>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <InventoryCard item={item} />
                    </li>
                  ))}
                </ul>
              </div>
              {view === "tabela" && (
                <div className="hidden md:block">
                  <InventoryTable items={items} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
