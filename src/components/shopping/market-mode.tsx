"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleSlash,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  SkipForward,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { finalizePurchaseAction } from "@/actions/purchases";
import { EmptyState } from "@/components/layout/empty-state";
import { StoreFormDialog } from "@/components/stores/store-form-dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { multiplyCents, sumCents } from "@/lib/calculations/money";
import { PACKAGE_UNITS, type PackageUnit } from "@/lib/constants/domain";
import {
  formatCents,
  formatDate,
  formatNormalizedPrice,
  formatQuantity,
  formatReais,
  todayISO,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { cartItemSchema } from "@/lib/validations/purchase";
import type { FinalizePurchaseResult, ShoppingListView } from "@/types/domain";

type EntryStatus = "pending" | "in_cart" | "not_found" | "skipped";

type Entry = {
  status: EntryStatus;
  unitPrice: string;
  brand: string;
  packageSize: string;
  packageUnit: PackageUnit | "";
  packagesCount: string;
  /** Valores validados quando o item foi para o carrinho. */
  cart?: { unitPriceCents: number; packagesCount: number; packageSize: number | null; packageUnit: PackageUnit | null; brand: string | null };
};

type Session = {
  step: "setup" | "shopping";
  storeId: string;
  purchaseDate: string;
  selectedIds: string[];
  entries: Record<string, Entry>;
  /** Ordem de exibição; itens pulados vão para o fim. */
  order: string[];
};

const STORAGE_PREFIX = "meu-armario:compra:v1:";

function initialEntry(item: ShoppingListView): Entry {
  return {
    status: "pending",
    unitPrice: "",
    brand: item.brand ?? "",
    packageSize: item.packageSize ? String(Number(item.packageSize)).replace(".", ",") : "",
    packageUnit: item.packageUnit ?? "",
    packagesCount: String(Math.max(1, Math.ceil(Number(item.desired_quantity)))),
  };
}

function loadSession(key: string): Session | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(key: string, session: Session | null) {
  try {
    if (session) window.localStorage.setItem(key, JSON.stringify(session));
    else window.localStorage.removeItem(key);
  } catch {
    // Armazenamento indisponível (modo privado): a compra segue apenas em memória
  }
}

export function MarketMode({
  userId,
  items,
  stores: initialStores,
  preselectedIds,
}: {
  userId: string;
  items: ShoppingListView[];
  stores: { id: string; name: string }[];
  preselectedIds: string[];
}) {
  const storageKey = `${STORAGE_PREFIX}${userId}`;
  const router = useRouter();
  const [stores, setStores] = useState(initialStores);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [setupError, setSetupError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [summary, setSummary] = useState<{ result: FinalizePurchaseResult; notFound: string[]; storeName: string; date: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Restaura a compra em andamento (o carrinho fica salvo no aparelho)
  useEffect(() => {
    const saved = loadSession(storageKey);
    const validIds = new Set(items.map((i) => i.id));
    const preselected = preselectedIds.filter((id) => validIds.has(id));
    let next: Session;
    if (saved && saved.step === "shopping" && preselected.length === 0) {
      const selectedIds = saved.selectedIds.filter((id) => validIds.has(id));
      next = { ...saved, selectedIds, order: saved.order.filter((id) => validIds.has(id)) };
    } else {
      next = {
        step: "setup",
        storeId: saved?.storeId && initialStores.some((s) => s.id === saved.storeId) ? saved.storeId : (initialStores[0]?.id ?? ""),
        purchaseDate: todayISO(),
        selectedIds: preselected.length ? preselected : items.map((i) => i.id),
        entries: {},
        order: [],
      };
    }
    // Hidratação a partir do localStorage só pode ocorrer no navegador
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(next);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded) saveSession(storageKey, session);
  }, [loaded, session, storageKey]);

  if (!loaded || !session) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    );
  }

  if (summary) return <PurchaseSummary {...summary} />;

  const update = (patch: Partial<Session>) => setSession((s) => (s ? { ...s, ...patch } : s));
  const updateEntry = (id: string, patch: Partial<Entry>) =>
    setSession((s) => (s ? { ...s, entries: { ...s.entries, [id]: { ...s.entries[id], ...patch } } } : s));

  // ------------------------------------------------------------------
  // Etapa 1: mercado, data e itens
  // ------------------------------------------------------------------
  if (session.step === "setup") {
    const selected = new Set(session.selectedIds);
    return (
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Antes de começar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormAlert message={setupError} />
            <div className="grid gap-2">
              <Label htmlFor="store">Mercado</Label>
              <div className="flex gap-2">
                <NativeSelect id="store" value={session.storeId} onChange={(e) => update({ storeId: e.target.value })}>
                  <option value="">Selecione o mercado</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button variant="outline" size="icon" aria-label="Cadastrar mercado" onClick={() => setStoreDialogOpen(true)}>
                  <Plus />
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Data da compra</Label>
              <Input
                id="date"
                type="date"
                max={todayISO()}
                value={session.purchaseDate}
                onChange={(e) => update({ purchaseDate: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens desta compra</CardTitle>
            {items.length > 0 && (
              <Button
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => update({ selectedIds: selected.size === items.length ? [] : items.map((i) => i.id) })}
              >
                {selected.size === items.length ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="A lista Tem que comprar está vazia"
                description="Adicione itens à lista antes de iniciar a compra."
                action={
                  <Button asChild>
                    <Link href="/tem-que-comprar">Ir para a lista</Link>
                  </Button>
                }
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {items.map((item) => (
                  <li key={item.id}>
                    <label className="flex min-h-14 items-center gap-3 py-2">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={(checked) =>
                          update({
                            selectedIds: checked
                              ? [...session.selectedIds, item.id]
                              : session.selectedIds.filter((id) => id !== item.id),
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.displayName}</span>
                        <span className="block text-sm text-muted-foreground">
                          {formatQuantity(item.desired_quantity, item.unit)}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {items.length > 0 && (
          <Button
            size="xl"
            onClick={() => {
              if (!session.storeId) return setSetupError("Selecione o mercado.");
              if (!session.purchaseDate) return setSetupError("Informe a data da compra.");
              if (!session.selectedIds.length) return setSetupError("Selecione pelo menos um item.");
              setSetupError(null);
              const entries: Record<string, Entry> = {};
              for (const id of session.selectedIds) {
                const item = itemById.get(id);
                if (item) entries[id] = session.entries[id] ?? initialEntry(item);
              }
              update({ step: "shopping", entries, order: [...session.selectedIds] });
              window.scrollTo({ top: 0 });
            }}
          >
            <ShoppingCart /> Começar compra
          </Button>
        )}

        <StoreFormDialog
          open={storeDialogOpen}
          onOpenChange={setStoreDialogOpen}
          onSaved={(store) => {
            setStores((current) => [...current, store].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
            update({ storeId: store.id });
          }}
        />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Etapa 2: modo mercado
  // ------------------------------------------------------------------
  const ids = session.order.filter((id) => itemById.has(id) && session.entries[id]);
  const entries = ids.map((id) => ({ id, item: itemById.get(id)!, entry: session.entries[id] }));
  const inCart = entries.filter((e) => e.entry.status === "in_cart");
  const notFound = entries.filter((e) => e.entry.status === "not_found");
  const open = entries.filter((e) => e.entry.status === "pending" || e.entry.status === "skipped");
  const done = entries.length - open.length;
  const totalCents = sumCents(inCart.map((e) => multiplyCents(e.entry.cart!.unitPriceCents, e.entry.cart!.packagesCount)));
  const storeName = stores.find((s) => s.id === session.storeId)?.name ?? "Mercado";

  function addToCart(id: string) {
    const entry = session!.entries[id];
    const parsed = cartItemSchema.safeParse({
      unitPrice: entry.unitPrice,
      brand: entry.brand,
      packageSize: entry.packageSize,
      packageUnit: entry.packageUnit,
      packagesCount: entry.packagesCount,
    });
    if (!parsed.success) {
      setErrors((e) => ({ ...e, [id]: parsed.error.issues[0].message }));
      return;
    }
    setErrors((e) => ({ ...e, [id]: "" }));
    updateEntry(id, {
      status: "in_cart",
      cart: {
        unitPriceCents: parsed.data.unitPrice,
        packagesCount: parsed.data.packagesCount,
        packageSize: parsed.data.packageSize,
        packageUnit: parsed.data.packageSize === null ? null : parsed.data.packageUnit,
        brand: parsed.data.brand,
      },
    });
  }

  function skip(id: string) {
    updateEntry(id, { status: "skipped" });
    // Move para o fim da fila
    update({ order: [...session!.order.filter((x) => x !== id), id] });
  }

  function finalize() {
    const payload = inCart.map(({ id, item, entry }) => ({
      shoppingListItemId: id,
      productId: item.product_id,
      name: item.displayName,
      brand: entry.cart!.brand,
      unitPriceCents: entry.cart!.unitPriceCents,
      packageSize: entry.cart!.packageSize,
      packageUnit: entry.cart!.packageUnit,
      packagesCount: entry.cart!.packagesCount,
    }));
    const notFoundNames = entries.filter((e) => e.entry.status !== "in_cart").map((e) => e.item.displayName);

    startTransition(async () => {
      const result = await finalizePurchaseAction({ storeId: session!.storeId, purchaseDate: session!.purchaseDate, items: payload });
      setConfirmOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      saveSession(storageKey, null);
      setSummary({ result: result.data, notFound: notFoundNames, storeName, date: session!.purchaseDate });
      window.scrollTo({ top: 0 });
      router.refresh();
    });
  }

  return (
    <div className="pb-28 md:pb-24">
      {/* Cabeçalho fixo com o resumo da compra */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <Store className="size-4 shrink-0 text-primary" aria-hidden />
              {storeName}
            </p>
            <p className="text-sm text-muted-foreground">
              {inCart.length} no carrinho · {open.length} {open.length === 1 ? "restante" : "restantes"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold tabular-nums" aria-live="polite">
              {formatCents(totalCents)}
            </p>
          </div>
        </div>
        <Progress
          value={entries.length ? (done / entries.length) * 100 : 0}
          className="mx-auto mt-2 max-w-2xl"
          aria-label={`${done} de ${entries.length} itens resolvidos`}
        />
      </div>

      <div className="mx-auto grid max-w-2xl gap-3">
        {open.length === 0 && (
          <FormAlert variant="success" message="Todos os itens foram resolvidos. Confira o carrinho e finalize a compra." />
        )}

        {open.map(({ id, item, entry }) => (
          <Card key={id} className={cn("gap-3 py-4", entry.status === "skipped" && "border-dashed")}>
            <CardContent className="grid gap-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg leading-tight font-semibold">{item.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatQuantity(item.desired_quantity, item.unit)}
                    {item.brand ? ` · ${item.brand}` : ""}
                  </p>
                </div>
                {entry.status === "skipped" && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Pulado</span>}
              </div>

              {(item.lastPurchase || item.lowestNormalizedPrice) && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Último preço</p>
                    <p className="font-semibold">{item.lastPurchase ? formatReais(item.lastPurchase.unit_price) : "Sem registro"}</p>
                  </div>
                  <div className="rounded-lg bg-success-soft px-3 py-2 text-success-strong">
                    <p className="text-xs">Menor preço</p>
                    <p className="font-semibold">
                      {item.lowestNormalizedPrice
                        ? formatNormalizedPrice(item.lowestNormalizedPrice.price, item.lowestNormalizedPrice.unit)
                        : "Sem registro"}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor={`price-${id}`}>Preço por embalagem</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id={`price-${id}`}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-14 pl-11 text-xl font-semibold"
                      value={entry.unitPrice}
                      onChange={(e) => updateEntry(id, { unitPrice: e.target.value })}
                      aria-invalid={Boolean(errors[id])}
                    />
                  </div>
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor={`brand-${id}`}>Marca encontrada</Label>
                  <Input id={`brand-${id}`} value={entry.brand} onChange={(e) => updateEntry(id, { brand: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`size-${id}`}>Peso ou volume</Label>
                  <Input
                    id={`size-${id}`}
                    inputMode="decimal"
                    value={entry.packageSize}
                    onChange={(e) => updateEntry(id, { packageSize: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`unit-${id}`}>Unidade</Label>
                  <NativeSelect
                    id={`unit-${id}`}
                    value={entry.packageUnit}
                    onChange={(e) => updateEntry(id, { packageUnit: e.target.value as PackageUnit | "" })}
                  >
                    <option value="">Não informar</option>
                    {PACKAGE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor={`count-${id}`}>Quantidade de embalagens</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-12"
                      aria-label="Diminuir embalagens"
                      onClick={() =>
                        updateEntry(id, { packagesCount: String(Math.max(1, (parseInt(entry.packagesCount, 10) || 1) - 1)) })
                      }
                    >
                      −
                    </Button>
                    <Input
                      id={`count-${id}`}
                      inputMode="numeric"
                      className="h-12 text-center text-lg font-semibold"
                      value={entry.packagesCount}
                      onChange={(e) => updateEntry(id, { packagesCount: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-12"
                      aria-label="Aumentar embalagens"
                      onClick={() =>
                        updateEntry(id, { packagesCount: String(Math.min(999, (parseInt(entry.packagesCount, 10) || 0) + 1)) })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {errors[id] && (
                <p role="alert" className="text-sm text-destructive">
                  {errors[id]}
                </p>
              )}

              <Button size="xl" onClick={() => addToCart(id)}>
                <ShoppingCart /> Adicionar ao carrinho
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" onClick={() => updateEntry(id, { status: "not_found" })}>
                  <CircleSlash /> Não encontrei
                </Button>
                <Button variant="ghost" size="lg" onClick={() => skip(id)}>
                  <SkipForward /> Pular
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {inCart.length > 0 && (
          <section aria-labelledby="carrinho" className="grid gap-2">
            <h2 id="carrinho" className="mt-2 text-sm font-semibold text-muted-foreground">
              No carrinho ({inCart.length})
            </h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {inCart.map(({ id, item, entry }) => (
                <li key={id} className="flex items-center gap-3 p-3">
                  <Check className="size-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.cart!.packagesCount} x {formatCents(entry.cart!.unitPriceCents)}
                      {entry.cart!.brand ? ` · ${entry.cart!.brand}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {formatCents(multiplyCents(entry.cart!.unitPriceCents, entry.cart!.packagesCount))}
                  </p>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${item.displayName}`} onClick={() => updateEntry(id, { status: "pending" })}>
                    <Pencil />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notFound.length > 0 && (
          <section aria-labelledby="nao-encontrados" className="grid gap-2">
            <h2 id="nao-encontrados" className="mt-2 text-sm font-semibold text-muted-foreground">
              Não encontrados ({notFound.length}) · continuam na lista
            </h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {notFound.map(({ id, item }) => (
                <li key={id} className="flex items-center gap-3 p-3">
                  <X className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-muted-foreground">{item.displayName}</p>
                  <Button variant="ghost" size="sm" onClick={() => updateEntry(id, { status: "pending" })}>
                    <RotateCcw /> Desfazer
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button variant="link" className="justify-self-center text-muted-foreground" onClick={() => setCancelOpen(true)}>
          Cancelar compra
        </Button>
      </div>

      {/* Ação principal sempre ao alcance do polegar */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto max-w-2xl">
          <Button size="xl" className="w-full" disabled={!inCart.length || pending} onClick={() => setConfirmOpen(true)}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            Finalizar compra · {formatCents(totalCents)}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar compra?</AlertDialogTitle>
            <AlertDialogDescription>
              {inCart.length} {inCart.length === 1 ? "produto" : "produtos"} por {formatCents(totalCents)} em {storeName}, no dia{" "}
              {formatDate(session.purchaseDate)}. O armário será atualizado e a compra não poderá ser editada depois.
              {open.length + notFound.length > 0 &&
                ` ${open.length + notFound.length} ${open.length + notFound.length === 1 ? "item continuará" : "itens continuarão"} na lista.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                finalize();
              }}
            >
              {pending && <Loader2 className="animate-spin" />}
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta compra?</AlertDialogTitle>
            <AlertDialogDescription>O carrinho será descartado. Nenhum dado do armário ou da lista foi alterado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar comprando</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setSession({ ...session, step: "setup", entries: {}, order: [] });
              }}
            >
              Cancelar compra
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PurchaseSummary({
  result,
  notFound,
  storeName,
  date,
}: {
  result: FinalizePurchaseResult;
  notFound: string[];
  storeName: string;
  date: string;
}) {
  const higher = result.items.filter((i) => i.price_change === "higher");
  const lower = result.items.filter((i) => i.price_change === "lower");

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-8 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-success-soft text-success-strong">
          <Check className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">Compra finalizada</h2>
        <p className="mt-1 text-3xl font-bold tabular-nums">{formatReais(result.total_amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {storeName} · {formatDate(date)} · {result.items_count} {result.items_count === 1 ? "produto" : "produtos"}
        </p>
      </div>

      {higher.length > 0 && (
        <SummaryList
          title="Mais caros que na compra anterior"
          tone="danger"
          icon={<ArrowUp className="size-4" />}
          rows={higher.map((i) => ({
            name: i.name,
            detail: `${formatNormalizedPrice(i.previous_normalized_unit_price, i.normalized_unit)} para ${formatNormalizedPrice(i.normalized_unit_price, i.normalized_unit)}`,
          }))}
        />
      )}
      {lower.length > 0 && (
        <SummaryList
          title="Mais baratos que na compra anterior"
          tone="success"
          icon={<ArrowDown className="size-4" />}
          rows={lower.map((i) => ({
            name: i.name,
            detail: `${formatNormalizedPrice(i.previous_normalized_unit_price, i.normalized_unit)} para ${formatNormalizedPrice(i.normalized_unit_price, i.normalized_unit)}`,
          }))}
        />
      )}
      {notFound.length > 0 && (
        <SummaryList
          title="Não comprados (continuam na lista)"
          tone="muted"
          icon={<CircleSlash className="size-4" />}
          rows={notFound.map((name) => ({ name, detail: "" }))}
        />
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild size="lg" variant="outline">
          <Link href={`/historico/${result.purchase_id}`}>Ver detalhes da compra</Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}

function SummaryList({
  title,
  rows,
  tone,
  icon,
}: {
  title: string;
  rows: { name: string; detail: string }[];
  tone: "danger" | "success" | "muted";
  icon: React.ReactNode;
}) {
  const color = { danger: "text-danger-strong", success: "text-success-strong", muted: "text-muted-foreground" }[tone];
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", color)}>
        {icon}
        {title}
      </h3>
      <ul className="grid gap-1.5 text-sm">
        {rows.map((row) => (
          <li key={row.name} className="flex justify-between gap-3">
            <span className="truncate">{row.name}</span>
            {row.detail && <span className="shrink-0 text-muted-foreground">{row.detail}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
