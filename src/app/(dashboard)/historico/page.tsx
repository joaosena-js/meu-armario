import { Receipt, SearchX } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { HistoryFilters } from "@/components/purchases/history-filters";
import { PurchaseList } from "@/components/purchases/purchase-list";
import { sumCents, toCents } from "@/lib/calculations/money";
import { formatCents } from "@/lib/formatters";
import { getCatalogOptions } from "@/lib/queries/catalog";
import { listPurchases } from "@/lib/queries/purchases";
import { historyFilterSchema } from "@/lib/validations/purchase";

export const metadata: Metadata = { title: "Histórico" };

export default async function HistoryPage({ searchParams }: PageProps<"/historico">) {
  const raw = await searchParams;
  const parsed = historyFilterSchema.safeParse({
    from: typeof raw.from === "string" ? raw.from : undefined,
    to: typeof raw.to === "string" ? raw.to : undefined,
    store: typeof raw.store === "string" ? raw.store : undefined,
  });
  const filters = parsed.success ? parsed.data : {};
  const hasFilters = Boolean(filters.from || filters.to || filters.store);

  const [purchases, catalog] = await Promise.all([listPurchases(filters), getCatalogOptions()]);
  const total = sumCents(purchases.map((p) => toCents(p.total_amount)));

  return (
    <>
      <PageHeader
        title="Histórico"
        description={
          purchases.length
            ? `${purchases.length} ${purchases.length === 1 ? "compra" : "compras"} · ${formatCents(total)}`
            : "Compras finalizadas no modo mercado."
        }
      />
      <HistoryFilters stores={catalog.stores} />
      {purchases.length ? (
        <PurchaseList purchases={purchases} showProducts />
      ) : hasFilters ? (
        <EmptyState icon={SearchX} title="Nenhuma compra no período" description="Altere as datas ou o mercado selecionado." />
      ) : (
        <EmptyState icon={Receipt} title="Nenhuma compra registrada" description="As compras finalizadas aparecem aqui." />
      )}
    </>
  );
}
