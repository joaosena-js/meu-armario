import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Link inválido" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <AuthCard title="Link inválido ou expirado" description="Os links enviados por e-mail podem ser usados uma única vez e expiram.">
          <div className="grid gap-2">
            <Button asChild size="lg">
              <Link href="/recuperar-senha">Solicitar novo link</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Voltar para o login</Link>
            </Button>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
