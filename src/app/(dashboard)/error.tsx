"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <h2 className="font-semibold">Algo deu errado</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Não foi possível carregar esta tela. Verifique sua conexão e tente novamente.
      </p>
      <Button className="mt-5" onClick={() => retry()}>
        Tentar novamente
      </Button>
    </div>
  );
}
