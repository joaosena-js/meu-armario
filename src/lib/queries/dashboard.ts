import "server-only";

import { endOfMonth, format, startOfMonth } from "date-fns";

import { sumCents, toCents } from "@/lib/calculations/money";
import { createClient } from "@/lib/supabase/server";
import { listPurchases } from "./purchases";

export async function getDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const [inventory, pending, monthPurchases, recent] = await Promise.all([
    supabase.from("inventory_items").select("status"),
    supabase.from("shopping_list_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("purchases").select("total_amount").gte("purchase_date", monthStart).lte("purchase_date", monthEnd),
    listPurchases({}, 5),
  ]);

  const statuses = inventory.data ?? [];
  return {
    productsCount: statuses.length,
    lowStockCount: statuses.filter((s) => s.status === "low_stock").length,
    outOfStockCount: statuses.filter((s) => s.status === "out_of_stock").length,
    pendingCount: pending.count ?? 0,
    monthSpentCents: sumCents((monthPurchases.data ?? []).map((p) => toCents(p.total_amount))),
    recentPurchases: recent,
  };
}
