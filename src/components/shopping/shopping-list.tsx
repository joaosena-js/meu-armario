"use client";

import { Check, ListChecks, MoreVertical, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { markShoppingItemPurchasedAction, removeShoppingItemAction } from "@/actions/shopping-list";
import { EmptyState } from "@/components/layout/empty-state";
import { AddItemDialog } from "@/components/shopping/add-item-dialog";
import { EditItemDialog } from "@/components/shopping/edit-item-dialog";
import { PriorityBadge } from "@/components/shopping/priority-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIST_REASON_LABEL } from "@/lib/constants/domain";
import { formatDate, formatNormalizedPrice, formatQuantity, formatReais } from "@/lib/formatters";
import type { ProductOption } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";
import type { ShoppingListView } from "@/types/domain";

export function ShoppingList({ items, products }: { items: ShoppingListView[]; products: ProductOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ShoppingListView | null>(null);
  const [removing, setRemoving] = useState<ShoppingListView | null>(null);
  const [pending, startTransition] = useTransition();
  const pendingProductIds = items.flatMap((i) => (i.product_id ? [i.product_id] : []));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
      router.refresh();
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  const startHref = selected.size ? `/comprar?itens=${Array.from(selected).join(",")}` : "/comprar";

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button size="lg" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus /> Adicionar item
        </Button>
        {items.length > 0 && (
          <Button asChild size="lg">
            <Link href={startHref}>
              <ShoppingCart />
              {selected.size ? `Comprar ${selected.size} selecionados` : "Iniciar compra"}
            </Link>
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nada para comprar"
          description="Os produtos que acabarem aparecem aqui. Você também pode adicionar itens manualmente."
        />
      ) : (
        <>
          <label className="mb-2 flex h-10 items-center gap-3 px-1 text-sm text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => setSelected(checked ? new Set(items.map((i) => i.id)) : new Set())}
            />
            Selecionar todos para iniciar compra
          </label>
          <ul className={cn("grid gap-3 md:grid-cols-2", pending && "opacity-70")}>
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
                <Checkbox
                  className="mt-1"
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggle(item.id)}
                  aria-label={`Selecionar ${item.displayName} para a compra`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.displayName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {[item.brand, item.categoryName].filter(Boolean).join(" · ") || "Sem marca definida"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label={`Ações para ${item.displayName}`}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(item)}>
                          <Pencil /> Alterar quantidade, prioridade ou observação
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => run(() => markShoppingItemPurchasedAction(item.id))}>
                          <Check /> Marcar como comprado
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(item)}>
                          <Trash2 /> Remover da lista
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{formatQuantity(item.desired_quantity, item.unit)}</span>
                    <PriorityBadge priority={item.priority} />
                  </div>

                  <dl className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
                    <div>
                      <dt className="sr-only">Motivo</dt>
                      <dd>
                        {LIST_REASON_LABEL[item.reason]} em {formatDate(item.created_at)}
                      </dd>
                    </div>
                    {item.lastPurchase && (
                      <div>
                        <dt className="sr-only">Última compra</dt>
                        <dd>
                          Último preço {formatReais(item.lastPurchase.unit_price)} ({item.lastPurchase.store_name},{" "}
                          {formatDate(item.lastPurchase.purchase_date)})
                        </dd>
                      </div>
                    )}
                    {item.lowestNormalizedPrice && (
                      <div>
                        <dt className="sr-only">Menor preço</dt>
                        <dd>Menor preço {formatNormalizedPrice(item.lowestNormalizedPrice.price, item.lowestNormalizedPrice.unit)}</dd>
                      </div>
                    )}
                    {item.notes && (
                      <div>
                        <dt className="sr-only">Observação</dt>
                        <dd className="text-foreground">{item.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} products={products} pendingProductIds={pendingProductIds} />

      {editing && (
        <EditItemDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          item={{
            id: editing.id,
            name: editing.displayName,
            quantity: Number(editing.desired_quantity),
            unit: editing.unit,
            priority: editing.priority,
            notes: editing.notes,
          }}
        />
      )}

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {removing?.displayName} da lista?</AlertDialogTitle>
            <AlertDialogDescription>O item sai da lista Tem que comprar. O armário não é alterado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removing) run(() => removeShoppingItemAction(removing.id));
                setRemoving(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
