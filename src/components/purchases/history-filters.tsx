"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export function HistoryFilters({ stores }: { stores: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const hasFilters = Boolean(searchParams.get("from") || searchParams.get("to") || searchParams.get("store"));

  return (
    <div className={cn("mb-4 grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto] md:items-end", pending && "opacity-70")}>
      <div className="grid gap-1.5">
        <Label htmlFor="from">De</Label>
        <Input id="from" type="date" value={searchParams.get("from") ?? ""} onChange={(e) => update("from", e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="to">Até</Label>
        <Input id="to" type="date" value={searchParams.get("to") ?? ""} onChange={(e) => update("to", e.target.value)} />
      </div>
      <div className="col-span-2 grid gap-1.5 md:col-span-1">
        <Label htmlFor="store-filter">Mercado</Label>
        <NativeSelect id="store-filter" value={searchParams.get("store") ?? ""} onChange={(e) => update("store", e.target.value)}>
          <option value="">Todos os mercados</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          className="col-span-2 md:col-span-1"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
