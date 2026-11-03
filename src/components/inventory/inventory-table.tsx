import Link from "next/link";

import { InventoryItemActions } from "@/components/inventory/inventory-item-actions";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { ProductImage } from "@/components/products/product-image";
import { formatDate, formatPackage, formatReais } from "@/lib/formatters";
import type { InventoryView } from "@/types/domain";

/** Tabela exibida somente no computador. */
export function InventoryTable({ items }: { items: InventoryView[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Produto</th>
            <th scope="col" className="px-4 py-3 font-medium">Estado</th>
            <th scope="col" className="px-4 py-3 font-medium">Quantidade</th>
            <th scope="col" className="px-4 py-3 font-medium">Local</th>
            <th scope="col" className="px-4 py-3 font-medium">Última compra</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ProductImage src={item.product.image_url} alt={item.product.name} className="size-10" />
                  <div className="min-w-0">
                    <Link href={`/armario/${item.id}`} className="font-medium hover:underline">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[item.product.brand, item.category?.name, formatPackage(item.package_size, item.package_unit, item.units_per_package)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <StockStatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                <InventoryItemActions
                  id={item.id}
                  productId={item.product_id}
                  productName={item.product.name}
                  status={item.status}
                  quantity={Number(item.current_quantity)}
                  unit={item.control_unit}
                  inShoppingList={item.inShoppingList}
                  variant="quantity"
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{item.location?.name ?? ""}</td>
              <td className="px-4 py-3">
                {item.lastPurchase ? (
                  <>
                    <span className="font-medium">{formatReais(item.lastPurchase.unit_price)}</span>
                    <p className="text-xs text-muted-foreground">
                      {item.lastPurchase.store_name} · {formatDate(item.lastPurchase.purchase_date)}
                    </p>
                  </>
                ) : (
                  <span className="text-muted-foreground">Sem compras</span>
                )}
              </td>
              <td className="px-2 py-3 text-right">
                <InventoryItemActions
                  id={item.id}
                  productId={item.product_id}
                  productName={item.product.name}
                  status={item.status}
                  quantity={Number(item.current_quantity)}
                  unit={item.control_unit}
                  inShoppingList={item.inShoppingList}
                  variant="menu"
                  className="justify-end"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
