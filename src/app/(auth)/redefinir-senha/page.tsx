import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requireUser } from "@/lib/queries/auth";

export const metadata: Metadata = { title: "Nova senha" };

/** Aberta pelo link do e-mail, que cria uma sessão temporária em /auth/confirm. */
export default async function ResetPasswordPage() {
  await requireUser();
  return (
    <AuthCard title="Criar nova senha" description="Escolha uma senha com pelo menos 8 caracteres, letras e números.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
