import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeSync } from "@/components/layout/theme-sync";
import { requireUser } from "@/lib/queries/auth";
import { getUserSettings } from "@/lib/queries/settings";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const supabase = await createClient();
  const [settings, pending] = await Promise.all([
    getUserSettings(),
    supabase.from("shopping_list_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const userName = user.fullName ?? user.email ?? "Minha conta";
  const pendingCount = pending.count ?? 0;

  return (
    <div className="min-h-dvh md:flex">
      <Sidebar userName={userName} pendingCount={pendingCount} />
      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <BottomNav userName={userName} pendingCount={pendingCount} />
      <ThemeSync theme={settings.theme} />
    </div>
  );
}
