import {
  ArrowLeftRight,
  History,
  Home,
  ListChecks,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  Store,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const NAV_ITEMS = {
  inicio: { href: "/", label: "Início", shortLabel: "Início", icon: Home },
  armario: { href: "/armario", label: "Meu Armário", shortLabel: "Armário", icon: Package },
  lista: { href: "/tem-que-comprar", label: "Tem que comprar", shortLabel: "Lista", icon: ListChecks },
  comprar: { href: "/comprar", label: "Comprar", shortLabel: "Comprar", icon: ShoppingCart },
  comparador: { href: "/comparador", label: "Comparador", shortLabel: "Comparar", icon: ArrowLeftRight },
  mercados: { href: "/mercados", label: "Mercados", shortLabel: "Mercados", icon: Store },
  historico: { href: "/historico", label: "Histórico", shortLabel: "Histórico", icon: History },
  configuracoes: { href: "/configuracoes", label: "Configurações", shortLabel: "Ajustes", icon: Settings },
} satisfies Record<string, NavItem>;

/** Barra lateral do computador: todos os acessos. */
export const SIDEBAR_ITEMS: NavItem[] = [
  NAV_ITEMS.inicio,
  NAV_ITEMS.armario,
  NAV_ITEMS.lista,
  NAV_ITEMS.comprar,
  NAV_ITEMS.comparador,
  NAV_ITEMS.mercados,
  NAV_ITEMS.historico,
  NAV_ITEMS.configuracoes,
];

/** Barra inferior do celular: quatro acessos + "Menu". */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS.inicio,
  NAV_ITEMS.armario,
  NAV_ITEMS.comprar,
  NAV_ITEMS.comparador,
];

/** Itens que aparecem no menu "Menu" do celular. */
export const MOBILE_MENU_ITEMS: NavItem[] = [
  NAV_ITEMS.lista,
  NAV_ITEMS.mercados,
  NAV_ITEMS.historico,
  NAV_ITEMS.configuracoes,
];

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
