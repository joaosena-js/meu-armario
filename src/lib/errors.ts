import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { z } from "zod";

import type { ActionResult } from "@/types/domain";

/** Traduz erros do banco em mensagens para a interface, sem expor detalhes. */
export function databaseErrorMessage(error: Pick<PostgrestError, "code" | "message"> | null | undefined) {
  if (!error) return "Não foi possível concluir a operação.";
  switch (error.code) {
    case "P0001":
      // Mensagens escritas em português nas funções SQL
      return error.message;
    case "23505":
      return "Já existe um registro com esse nome.";
    case "23503":
      return "Não é possível concluir: existem registros vinculados a este item.";
    case "23514":
      return "Algum valor informado não é permitido.";
    case "42501":
      return "Você não tem permissão para esta operação.";
    case "PGRST116":
      return "Registro não encontrado.";
    default:
      console.error("[supabase]", error.code, error.message);
      return "Não foi possível concluir a operação. Tente novamente.";
  }
}

export function failure(error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function validationFailure(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos.", fieldErrors };
}
