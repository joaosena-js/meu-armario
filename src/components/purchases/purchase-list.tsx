import { ChevronRight, Store } from "lucide-react";
import Link from "next/link";

import { formatDate, formatReais } from "@/lib/formatters";
import type { PurchaseListItem } from "@/lib/queries/purchases";

export function PurchaseList({ purchases, showProducts = false }: { purchases: PurchaseListItem[]; showProducts?: boolean }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {purchases.map((purchase) => (
        <li key={purchase.id}>
          <Link href={`/historico/${purchase.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Store className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{purchase.storeName}</span>
              <span className="block text-sm text-muted-foreground">
                {formatDate(purchase.purchase_date)} · {purchase.itemsCount} {purchase.itemsCount === 1 ? "item" : "itens"}
              </span>
              {showProducts && purchase.productNames.length > 0 && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {purchase.productNames.slice(0, 4).join(", ")}
                  {purchase.productNames.length > 4 ? ` e mais ${purchase.productNames.length - 4}` : ""}
                </span>
              )}
            </span>
            <span className="text-right font-semibold tabular-nums">{formatReais(purchase.total_amount)}</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
