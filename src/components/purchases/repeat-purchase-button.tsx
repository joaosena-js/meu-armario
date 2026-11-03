"use client";

import { Loader2, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { repeatPurchaseAction } from "@/actions/shopping-list";
import { Button } from "@/components/ui/button";

export function RepeatPurchaseButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await repeatPurchaseAction(purchaseId);
          if (result.ok) {
            toast.success(result.message, { action: { label: "Ver lista", onClick: () => router.push("/tem-que-comprar") } });
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Repeat />}
      Repetir produtos em nova lista
    </Button>
  );
}
