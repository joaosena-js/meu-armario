import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Package className="size-5" aria-hidden />
      </span>
      {!compact && <span className="text-lg">Meu Armário</span>}
    </span>
  );
}
