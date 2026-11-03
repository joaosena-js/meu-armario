import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Página não encontrada"
      description="O item pode ter sido excluído ou o endereço está incorreto."
      action={
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      }
    />
  );
}
