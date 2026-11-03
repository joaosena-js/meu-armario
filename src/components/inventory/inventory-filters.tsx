"use client";

import { LayoutGrid, Search, Table2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { STOCK_STATUS_LABEL, STOCK_STATUSES } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";

export function InventoryFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // Pesquisa com pequena espera para não recarregar a cada letra
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => update("q", q.trim()), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const view = searchParams.get("vista") ?? "cartoes";
  const hasFilters = Boolean(searchParams.get("q") || searchParams.get("categoria") || searchParams.get("status"));

  return (
    <div className={cn("grid gap-2 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Pesquisar por nome, marca ou código"
          aria-label="Pesquisar produtos"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
        <NativeSelect
          aria-label="Filtrar por categoria"
          value={searchParams.get("categoria") ?? ""}
          onChange={(e) => update("categoria", e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filtrar por estado do estoque"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">Todos os estados</option>
          {STOCK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STOCK_STATUS_LABEL[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Ordenar"
          className="col-span-2 md:col-span-1"
          value={searchParams.get("ordem") ?? "name"}
          onChange={(e) => update("ordem", e.target.value === "name" ? "" : e.target.value)}
        >
          <option value="name">Ordem alfabética</option>
          <option value="quantity">Menor quantidade</option>
          <option value="updated">Atualizados recentemente</option>
        </NativeSelect>
        <div className="col-span-2 hidden gap-1 md:col-span-1 md:flex" role="group" aria-label="Modo de visualização">
          <Button
            variant={view === "cartoes" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Ver em cartões"
            aria-pressed={view === "cartoes"}
            onClick={() => update("vista", "")}
          >
            <LayoutGrid />
          </Button>
          <Button
            variant={view === "tabela" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Ver em tabela"
            aria-pressed={view === "tabela"}
            onClick={() => update("vista", "tabela")}
          >
            <Table2 />
          </Button>
        </div>
      </div>
      {hasFilters && (
        <Button
          variant="link"
          size="sm"
          className="justify-self-start px-0"
          onClick={() => {
            setQ("");
            const params = new URLSearchParams();
            if (searchParams.get("vista")) params.set("vista", searchParams.get("vista")!);
            if (searchParams.get("ordem")) params.set("ordem", searchParams.get("ordem")!);
            startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
          }}
        >
          <X /> Limpar filtros
        </Button>
      )}
    </div>
  );
}
