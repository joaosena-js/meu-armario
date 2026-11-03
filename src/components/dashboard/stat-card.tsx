import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const TONE = {
  default: "bg-accent text-accent-foreground",
  warning: "bg-warning-soft text-warning-strong",
  danger: "bg-danger-soft text-danger-strong",
  neutral: "bg-muted text-foreground",
} as const;

export function StatCard({
  href,
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONE;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", TONE[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl leading-tight font-semibold tabular-nums">{value}</span>
        <span className="block truncate text-sm text-muted-foreground">{label}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
