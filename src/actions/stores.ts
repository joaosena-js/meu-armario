"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { databaseErrorMessage, failure, validationFailure } from "@/lib/errors";
import { requireUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";
import { storeSchema, type StoreInput } from "@/lib/validations/store";
import type { ActionResult } from "@/types/domain";

export async function saveStoreAction(input: StoreInput, id?: string): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (id && !z.uuid().safeParse(id).success) return failure("Dados inválidos.");

  const supabase = await createClient();
  const query = id
    ? supabase.from("stores").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("stores").insert(parsed.data).select("id").single();
  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") return failure("Você já cadastrou um mercado com esse nome.", { name: ["Nome já cadastrado."] });
    return failure(databaseErrorMessage(error));
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id }, message: id ? "Mercado atualizado." : "Mercado cadastrado." };
}

export async function deleteStoreAction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return failure("Dados inválidos.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("stores").delete({ count: "exact" }).eq("id", id);
  if (error) {
    if (error.code === "23503") return failure("Este mercado possui compras registradas e não pode ser excluído.");
    return failure(databaseErrorMessage(error));
  }
  if (!count) return failure("Mercado não encontrado.");
  revalidatePath("/", "layout");
  return { ok: true, data: undefined, message: "Mercado excluído." };
}
