import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="-ml-1 mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
