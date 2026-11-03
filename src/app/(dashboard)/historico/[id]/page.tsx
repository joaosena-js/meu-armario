import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { RepeatPurchaseButton } from "@/components/purchases/repeat-purchase-button";
import { formatDate, formatNormalizedPrice, formatPackage, formatReais } from "@/lib/formatters";
import { getPurchaseDetails } from "@/lib/queries/purchases";

export const metadata: Metadata = { title: "Detalhes da compra" };

export default async function PurchasePage({ params }: PageProps<"/historico/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const details = await getPurchaseDetails(id);
  if (!details) notFound();
  const { purchase, storeName, items } = details;

  return (
    <>
      <PageHeader
        title={storeName}
        description={`${formatDate(purchase.purchase_date)} · ${items.length} ${items.length === 1 ? "item" : "itens"} · ${formatReais(purchase.total_amount)}`}
        backHref="/historico"
        backLabel="Histórico"
        actions={<RepeatPurchaseButton purchaseId={purchase.id} />}
      />

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              {item.inventoryItemId ? (
                <Link href={`/armario/${item.inventoryItemId}`} className="font-medium hover:underline">
                  {item.productName}
                </Link>
              ) : (
                <p className="font-medium">{item.productName}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {[
                  item.brand,
                  `${item.packages_count} x ${formatReais(item.unit_price)}`,
                  formatPackage(item.package_size, item.package_unit, item.units_per_package),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">{formatReais(item.total_price)}</p>
              <p className="text-xs text-muted-foreground">{formatNormalizedPrice(item.normalized_unit_price, item.normalized_unit)}</p>
            </div>
          </li>
        ))}
        <li className="flex justify-between bg-muted/50 p-4 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatReais(purchase.total_amount)}</span>
        </li>
      </ul>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden />
        Compras finalizadas não podem ser editadas nem excluídas nesta versão.
      </p>
    </>
  );
}
