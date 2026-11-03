"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/actions/auth";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { BOTTOM_NAV_ITEMS, isActivePath, MOBILE_MENU_ITEMS } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

/** Barra fixa inferior do celular (abaixo de 768 px). */
export function BottomNav({ userName, pendingCount }: { userName: string; pendingCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuActive = MOBILE_MENU_ITEMS.some((item) => isActivePath(pathname, item.href));

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
        <li>
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger
              className={cn(
                "relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                menuActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Menu className="size-6" aria-hidden />
              Menu
              {pendingCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-1.25rem)] size-2.5 rounded-full bg-primary" aria-hidden />
              )}
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Menu</DrawerTitle>
                <DrawerDescription className="truncate">{userName}</DrawerDescription>
              </DrawerHeader>
              <ul className="grid gap-1 px-3 pb-2">
                {MOBILE_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex h-12 items-center gap-3 rounded-lg px-3 font-medium",
                          active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {item.href === "/tem-que-comprar" && pendingCount > 0 && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <form action={signOutAction}>
                    <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-lg px-3 font-medium hover:bg-muted">
                      <LogOut className="size-5" aria-hidden />
                      Sair
                    </button>
                  </form>
                </li>
              </ul>
            </DrawerContent>
          </Drawer>
        </li>
      </ul>
    </nav>
  );
}
