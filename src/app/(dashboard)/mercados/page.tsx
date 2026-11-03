import { ChevronRight, MapPin, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewStoreButton } from "@/components/stores/store-actions";
import { formatDate, formatReais } from "@/lib/formatters";
import { listStores } from "@/lib/queries/stores";

export const metadata: Metadata = { title: "Mercados" };

export default async function StoresPage() {
  const stores = await listStores();
  return (
    <>
      <PageHeader title="Mercados" description="Onde você costuma comprar." actions={<NewStoreButton />} />
      {stores.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nenhum mercado cadastrado"
          description="Cadastre os mercados para registrar compras e comparar preços entre eles."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                href={`/mercados/${store.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs hover:border-primary/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Store className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{store.name}</span>
                  {(store.neighborhood || store.city) && (
                    <span className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      {[store.neighborhood, store.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {store.stats?.purchases_count
                      ? `${store.stats.purchases_count} ${store.stats.purchases_count === 1 ? "compra" : "compras"} · ${formatReais(store.stats.total_spent)} · última em ${formatDate(store.stats.last_purchase_date)}`
                      : "Nenhuma compra registrada"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
