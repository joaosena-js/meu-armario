"use client";

import {
  AlertTriangle,
  Eye,
  History,
  ListPlus,
  Minus,
  MoreVertical,
  PackageX,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AskAddToListDialog } from "@/components/inventory/ask-add-to-list-dialog";
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
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInventoryActions } from "@/hooks/use-inventory-actions";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { StockStatus } from "@/lib/constants/domain";
import { formatQuantity } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  productId: string;
  productName: string;
  status: StockStatus;
  quantity: number;
  unit: string;
  inShoppingList: boolean;
  /** "full": quantidade e menu; "menu": só o menu; "quantity": só a quantidade. */
  variant?: "full" | "menu" | "quantity";
  /** Para onde ir depois de excluir (ex.: na página de detalhes). */
  afterDeleteHref?: string;
  className?: string;
};

type MenuAction = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onSelect?: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

export function InventoryItemActions({ id, productId, productName, status, quantity, unit, inShoppingList, variant = "full", afterDeleteHref, className }: Props) {
  const router = useRouter();
  const actions = useInventoryActions({ id, productId, productName });
  const isDesktop = useIsDesktop();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const menu: MenuAction[] = [
    { key: "view", label: "Visualizar", icon: Eye, href: `/armario/${id}` },
    { key: "edit", label: "Editar", icon: Pencil, href: `/armario/${id}/editar` },
    { key: "history", label: "Histórico de preços", icon: History, href: `/armario/${id}#historico` },
    { key: "low", label: "Marcar como acabando", icon: AlertTriangle, onSelect: actions.markLow, hidden: status !== "available" },
    { key: "out", label: "Marcar como acabou", icon: PackageX, onSelect: actions.markOut, hidden: status === "out_of_stock" },
    {
      key: "list",
      label: inShoppingList ? "Já está na lista" : "Adicionar à lista Tem que comprar",
      icon: ListPlus,
      onSelect: actions.addToList,
      hidden: inShoppingList,
    },
    { key: "delete", label: "Excluir do armário", icon: Trash2, onSelect: () => setConfirmDelete(true), destructive: true },
  ];
  const visible = menu.filter((m) => !m.hidden);

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Mais ações para ${productName}`}
      disabled={actions.pending}
      onClick={isDesktop ? undefined : () => setSheetOpen(true)}
    >
      <MoreVertical />
    </Button>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant !== "menu" && (
        <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Diminuir quantidade de ${productName}`}
            onClick={() => actions.adjust(-1)}
            disabled={actions.pending || quantity <= 0}
          >
            <Minus />
          </Button>
          <span className="min-w-16 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {formatQuantity(quantity, unit)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Aumentar quantidade de ${productName}`}
            onClick={() => actions.adjust(1)}
            disabled={actions.pending}
          >
            <Plus />
          </Button>
        </div>
      )}

      {variant === "quantity" ? null : isDesktop ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {visible.map((action, index) => (
              <div key={action.key}>
                {action.destructive && index > 0 && <DropdownMenuSeparator />}
                {action.href ? (
                  <DropdownMenuItem asChild>
                    <Link href={action.href}>
                      <action.icon /> {action.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem variant={action.destructive ? "destructive" : "default"} onSelect={action.onSelect}>
                    <action.icon /> {action.label}
                  </DropdownMenuItem>
                )}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          {trigger}
          <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{productName}</DrawerTitle>
                <DrawerDescription>{formatQuantity(quantity, unit)} em casa</DrawerDescription>
              </DrawerHeader>
              <ul className="grid gap-1 px-3 pb-4">
                {visible.map((action) => {
                  const content = (
                    <>
                      <action.icon className="size-5" />
                      {action.label}
                    </>
                  );
                  const classes = cn(
                    "flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-medium hover:bg-muted",
                    action.destructive && "text-destructive",
                  );
                  return (
                    <li key={action.key}>
                      {action.href ? (
                        <Link href={action.href} className={classes} onClick={() => setSheetOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={classes}
                          onClick={() => {
                            setSheetOpen(false);
                            action.onSelect?.();
                          }}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </DrawerContent>
          </Drawer>
        </>
      )}

      <AskAddToListDialog
        open={actions.askOpen}
        onOpenChange={actions.setAskOpen}
        productName={productName}
        onConfirm={actions.addToList}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {productName} do armário?</AlertDialogTitle>
            <AlertDialogDescription>
              O item sai do armário. O histórico de preços das compras anteriores é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => actions.remove(afterDeleteHref ? () => router.push(afterDeleteHref) : undefined)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
