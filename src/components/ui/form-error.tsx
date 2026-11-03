import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function FormAlert({
  message,
  variant = "error",
  className,
}: {
  message?: string | null;
  variant?: "error" | "success";
  className?: string;
}) {
  if (!message) return null;
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
        variant === "error" ? "bg-danger-soft text-danger-strong" : "bg-success-soft text-success-strong",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
