import { History, ListChecks, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { InventoryItemActions } from "@/components/inventory/inventory-item-actions";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProductImage } from "@/components/products/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatNormalizedPrice,
  formatNumber,
  formatPackage,
  formatQuantity,
  formatReais,
} from "@/lib/formatters";
import { getInventoryItem } from "@/lib/queries/inventory";

export const metadata: Metadata = { title: "Produto" };

export default async function InventoryItemPage({ params }: PageProps<"/armario/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const details = await getInventoryItem(id);
  if (!details) notFound();
  const { item, product, category, location, priceHistory, priceStats, inShoppingList } = details;
  const last = priceHistory[0];
  const lowest = last ? priceStats.find((s) => s.normalized_unit === last.normalized_unit) : undefined;

  const info: [string, string][] = [
    ["Categoria", category?.name ?? "Sem categoria"],
    ["Local", location?.name ?? "Não informado"],
    ["Quantidade mínima", formatQuantity(item.minimum_quantity, item.control_unit)],
    ["Embalagem", formatPackage(item.package_size, item.package_unit, item.units_per_package) || "Não informada"],
    ["Validade", item.expiration_date ? formatDate(item.expiration_date) : "Não informada"],
    ["Código de barras", product.barcode ?? "Não informado"],
  ];

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.brand ?? undefined}
        backHref="/armario"
        backLabel="Meu Armário"
        actions={
          <Button asChild variant="outline">
            <Link href={`/armario/${item.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <ProductImage src={product.image_url} alt={product.name} className="size-20" />
              <div className="grid gap-1.5">
                <StockStatusBadge status={item.status} />
                {inShoppingList && (
                  <Badge variant="secondary">
                    <ListChecks /> Na lista Tem que comprar
                  </Badge>
                )}
              </div>
            </div>
            <InventoryItemActions
              id={item.id}
              productId={product.id}
              productName={product.name}
              status={item.status}
              quantity={Number(item.current_quantity)}
              unit={item.control_unit}
              inShoppingList={inShoppingList}
              afterDeleteHref="/armario"
              className="justify-between"
            />
            <dl className="grid gap-2 text-sm">
              {info.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
            {(product.description || item.notes) && (
              <div className="grid gap-2 border-t pt-4 text-sm">
                {product.description && <p>{product.description}</p>}
                {item.notes && <p className="text-muted-foreground">{item.notes}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="historico" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>Histórico de preços</CardTitle>
            {last && (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-muted-foreground">Último preço</p>
                  <p className="text-lg font-semibold">{formatReais(last.unit_price)}</p>
                  <p className="text-xs text-muted-foreground">{formatNormalizedPrice(last.normalized_unit_price, last.normalized_unit)}</p>
                </div>
                {lowest && (
                  <div className="rounded-lg bg-success-soft p-3 text-success-strong">
                    <p>Menor preço registrado</p>
                    <p className="text-lg font-semibold">
                      {formatNormalizedPrice(lowest.min_normalized_unit_price, lowest.normalized_unit)}
                    </p>
                    <p className="text-xs">em {formatNumber(lowest.purchases_count)} compras</p>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {priceHistory.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sem compras registradas"
                description="Os preços aparecem aqui quando você registra uma compra deste produto."
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y">
                {priceHistory.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`/historico/${entry.purchase_id}`} className="font-medium hover:underline">
                        {entry.store_name}
                      </Link>
                      <p className="text-muted-foreground">
                        {formatDate(entry.purchase_date)} · {entry.packages_count}{" "}
                        {entry.packages_count === 1 ? "embalagem" : "embalagens"}
                        {entry.brand ? ` · ${entry.brand}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatReais(entry.unit_price)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNormalizedPrice(entry.normalized_unit_price, entry.normalized_unit)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
