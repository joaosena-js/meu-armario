import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PRODUCT_IMAGE_BUCKET, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from "@/lib/constants/domain";
import type { Database } from "@/types/database";

type ImageType = (typeof PRODUCT_IMAGE_TYPES)[number];

const EXTENSION: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Confere a assinatura do arquivo, sem confiar apenas no tipo informado pelo navegador. */
function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  return null;
}

export type UploadResult = { ok: true; url: string; path: string } | { ok: false; error: string };

export async function uploadProductImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<UploadResult> {
  if (file.size === 0) return { ok: false, error: "A foto enviada está vazia." };
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, error: "A foto deve ter no máximo 2 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);
  if (!detected) return { ok: false, error: "Envie uma foto em JPG, PNG ou WEBP." };

  // Nome aleatório: o nome original do arquivo nunca é usado
  const path = `${userId}/${crypto.randomUUID()}.${EXTENSION[detected]}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, bytes, {
    contentType: detected,
    upsert: false,
  });
  if (error) return { ok: false, error: "Não foi possível enviar a foto." };

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

export async function removeProductImage(supabase: SupabaseClient<Database>, path: string) {
  await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
}

/** Extrai o caminho no bucket a partir da URL pública. */
export function imagePathFromUrl(url: string | null) {
  if (!url) return null;
  const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
