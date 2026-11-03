"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { failure, validationFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignUpInput,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types/domain";

/** Aceita somente caminhos internos, evitando redirecionamento aberto. */
function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

async function siteUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;
}

export async function signInAction(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return failure("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
    if (error.status === 429) return failure("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    // Mensagem única para não revelar se o e-mail existe
    return failure("E-mail ou senha incorretos.");
  }
  redirect(safeNext(next));
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/`,
    },
  });

  if (error) {
    if (error.status === 429) return failure("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    if (error.code === "weak_password") return failure("Senha muito fraca. Use letras, números e pelo menos 8 caracteres.");
    if (error.code === "user_already_exists") return failure("Não foi possível criar a conta com este e-mail.");
    return failure("Não foi possível criar a conta. Tente novamente.");
  }

  if (data.session) redirect("/");
  return { ok: true, data: { needsConfirmation: true } };
}

export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/redefinir-senha`,
  });
  // Sempre retorna sucesso para não revelar quais e-mails possuem conta
  return { ok: true, data: undefined };
}

export async function updatePasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return failure("A nova senha deve ser diferente da anterior.");
    return failure("Não foi possível alterar a senha. Solicite um novo link.");
  }
  redirect("/?senha=alterada");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
