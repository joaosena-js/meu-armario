import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  confirmado: "E-mail confirmado. Entre com sua senha.",
  saiu: "Você saiu da sua conta.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = typeof params.aviso === "string" ? NOTICES[params.aviso] : undefined;

  return (
    <AuthCard
      title="Entrar"
      description="Acesse o estoque da sua casa."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm next={next} notice={notice} />
    </AuthCard>
  );
}
