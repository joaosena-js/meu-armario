"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/actions/auth";
import { Logo } from "@/components/layout/logo";
import { isActivePath, SIDEBAR_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

/** Navegação do computador e tablet na horizontal (a partir de 768 px). */
export function Sidebar({ userName, pendingCount }: { userName: string; pendingCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="px-5 py-5">
        <Link href="/" aria-label="Meu Armário, início">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3">
        <ul className="grid gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/tem-que-comprar" && pendingCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{pendingCount}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-3">
        <p className="truncate px-3 pb-2 text-sm text-muted-foreground" title={userName}>
          {userName}
        </p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-[18px]" aria-hidden />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
