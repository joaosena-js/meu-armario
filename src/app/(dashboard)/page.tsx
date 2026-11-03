import { AlertTriangle, ListChecks, Package, PackageX, Plus, Receipt, ShoppingCart, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";

import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PurchaseList } from "@/components/purchases/purchase-list";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-error";
import { formatCents, formatMonthYear } from "@/lib/formatters";
import { requireUser } from "@/lib/queries/auth";
import { getDashboardData } from "@/lib/queries/dashboard";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [user, data, params] = await Promise.all([requireUser(), getDashboardData(), searchParams]);
  const firstName = (user.fullName ?? "").split(" ")[0];
  const now = new Date();
  const monthHref = `/historico?from=${format(startOfMonth(now), "yyyy-MM-dd")}&to=${format(endOfMonth(now), "yyyy-MM-dd")}`;

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Olá{firstName ? `, ${firstName}` : ""}.</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Como está o seu armário</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button asChild size="lg" variant="outline">
            <Link href="/armario/novo">
              <Plus /> Cadastrar produto
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/comprar">
              <ShoppingCart /> Iniciar compra
            </Link>
          </Button>
        </div>
      </header>

      {params.senha === "alterada" && <FormAlert variant="success" message="Senha alterada com sucesso." />}

      <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard href="/armario" label="Produtos no armário" value={data.productsCount} icon={Package} />
        <StatCard
          href="/armario?status=low_stock"
          label="Acabando"
          value={data.lowStockCount}
          icon={AlertTriangle}
          tone={data.lowStockCount ? "warning" : "neutral"}
        />
        <StatCard
          href="/armario?status=out_of_stock"
          label="Acabaram"
          value={data.outOfStockCount}
          icon={PackageX}
          tone={data.outOfStockCount ? "danger" : "neutral"}
        />
        <StatCard href="/tem-que-comprar" label="Itens para comprar" value={data.pendingCount} icon={ListChecks} />
        <StatCard
          href={monthHref}
          label="Gasto no mês"
          hint={formatMonthYear(now)}
          value={formatCents(data.monthSpentCents)}
          icon={Wallet}
        />
      </section>

      <section aria-labelledby="ultimas-compras" className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 id="ultimas-compras" className="text-lg font-semibold">
            Últimas compras
          </h2>
          {data.recentPurchases.length > 0 && (
            <Link href="/historico" className="text-sm font-medium text-primary hover:underline">
              Ver histórico
            </Link>
          )}
        </div>
        {data.recentPurchases.length ? (
          <PurchaseList purchases={data.recentPurchases} />
        ) : (
          <EmptyState
            icon={Receipt}
            title="Nenhuma compra registrada"
            description="Use o modo Comprar no mercado para registrar preços e atualizar o armário automaticamente."
            action={
              <Button asChild>
                <Link href="/comprar">Iniciar compra</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
