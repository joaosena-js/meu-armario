import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StoreDetailActions } from "@/components/stores/store-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNormalizedPrice, formatReais } from "@/lib/formatters";
import { getStoreDetails } from "@/lib/queries/stores";

export const metadata: Metadata = { title: "Mercado" };

export default async function StorePage({ params }: PageProps<"/mercados/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const details = await getStoreDetails(id);
  if (!details) notFound();
  const { store, stats, productPrices, recentPurchases } = details;
  const purchases = stats?.purchases_count ?? 0;

  const metrics = [
    { label: "Compras realizadas", value: String(purchases) },
    { label: "Total gasto", value: formatReais(stats?.total_spent ?? 0) },
    { label: "Ticket médio", value: formatReais(stats?.average_ticket ?? 0) },
    { label: "Última compra", value: stats?.last_purchase_date ? formatDate(stats.last_purchase_date) : "Nenhuma" },
  ];

  return (
    <>
      <PageHeader
        title={store.name}
        description={[store.address, store.neighborhood, store.city].filter(Boolean).join(", ") || undefined}
        backHref="/mercados"
        backLabel="Mercados"
        actions={<StoreDetailActions store={store} canDelete={purchases === 0} />}
      />

      <section aria-label="Indicadores" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border bg-card p-4 shadow-xs">
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </section>

      {store.notes && <p className="mb-4 rounded-xl border bg-card p-4 text-sm text-muted-foreground">{store.notes}</p>}

      {purchases === 0 ? (
        <EmptyState icon={Receipt} title="Nenhuma compra neste mercado" description="As compras finalizadas aqui aparecem nesta página." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Produtos comprados recentemente</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {productPrices.map((p) => (
                  <li key={`${p.product_id}-${p.normalized_unit}`} className="flex justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Última vez em {formatDate(p.last_purchase_date)} · {p.purchases_count}{" "}
                        {p.purchases_count === 1 ? "compra" : "compras"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatReais(p.average_unit_price)}</p>
                      <p className="text-xs text-muted-foreground">
                        média {formatNormalizedPrice(p.average_normalized_unit_price, p.normalized_unit)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Últimas compras</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {recentPurchases.map((p) => (
                  <li key={p.id}>
                    <Link href={`/historico/${p.id}`} className="flex justify-between py-2.5 hover:underline">
                      <span>{formatDate(p.purchase_date)}</span>
                      <span className="font-semibold">{formatReais(p.total_amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
