import Link from "next/link";

import { InventoryItemActions } from "@/components/inventory/inventory-item-actions";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { ProductImage } from "@/components/products/product-image";
import { formatDate, formatPackage, formatReais } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { InventoryView } from "@/types/domain";

const BORDER: Record<InventoryView["status"], string> = {
  available: "border-l-success",
  low_stock: "border-l-warning",
  out_of_stock: "border-l-danger",
};

export function InventoryCard({ item }: { item: InventoryView }) {
  const packageLabel = formatPackage(item.package_size, item.package_unit, item.units_per_package);

  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 shadow-xs", BORDER[item.status])}>
      <div className="flex gap-3">
        <ProductImage src={item.product.image_url} alt={item.product.name} />
        <div className="min-w-0 flex-1">
          <Link href={`/armario/${item.id}`} className="block truncate font-semibold hover:underline">
            {item.product.name}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {[item.product.brand, item.category?.name].filter(Boolean).join(" · ") || "Sem marca ou categoria"}
          </p>
          <div className="mt-1.5">
            <StockStatusBadge status={item.status} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {packageLabel && (
          <>
            <dt className="text-muted-foreground">Embalagem</dt>
            <dd className="text-right">{packageLabel}</dd>
          </>
        )}
        {item.location && (
          <>
            <dt className="text-muted-foreground">Local</dt>
            <dd className="truncate text-right">{item.location.name}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Último preço</dt>
        <dd className="text-right">
          {item.lastPurchase ? (
            <span title={`${item.lastPurchase.store_name}, ${formatDate(item.lastPurchase.purchase_date)}`}>
              {formatReais(item.lastPurchase.unit_price)}
            </span>
          ) : (
            <span className="text-muted-foreground">Sem compras</span>
          )}
        </dd>
        {item.lastPurchase && (
          <dd className="col-span-2 truncate text-right text-xs text-muted-foreground">
            {item.lastPurchase.store_name} · {formatDate(item.lastPurchase.purchase_date)}
          </dd>
        )}
      </dl>

      <InventoryItemActions
        id={item.id}
        productId={item.product_id}
        productName={item.product.name}
        status={item.status}
        quantity={Number(item.current_quantity)}
        unit={item.control_unit}
        inShoppingList={item.inShoppingList}
        className="justify-between"
      />
    </article>
  );
}
