"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { addProductToListAction } from "@/actions/inventory";
import { createProductAction, updateProductAction } from "@/actions/products";
import { AskAddToListDialog } from "@/components/inventory/ask-add-to-list-dialog";
import { StoreFormDialog } from "@/components/stores/store-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CONTROL_UNITS, PACKAGE_UNITS, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES } from "@/lib/constants/domain";
import { todayISO } from "@/lib/formatters";
import type { CatalogOptions } from "@/lib/queries/catalog";
import { createProductSchema, type CreateProductInput, type CreateProductOutput } from "@/lib/validations/product";
import type { ActionResult, InventoryChangeResult } from "@/types/domain";

export type ProductFormDefaults = Partial<CreateProductInput> & {
  inventoryItemId?: string;
  productId?: string;
  imageUrl?: string | null;
};

type Props = {
  mode: "create" | "edit";
  catalog: CatalogOptions;
  defaults?: ProductFormDefaults;
};

const EMPTY: CreateProductInput = {
  name: "",
  brand: "",
  categoryId: "",
  description: "",
  barcode: "",
  storageLocationId: "",
  currentQuantity: "1",
  minimumQuantity: "1",
  controlUnit: "unidade",
  packageSize: "",
  packageUnit: "",
  unitsPerPackage: "1",
  expirationDate: "",
  notes: "",
  registerPurchase: false,
  purchasePrice: "",
  purchasePackages: "1",
  storeId: "",
  purchaseDate: "",
};

export function ProductForm({ mode, catalog, defaults }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState(catalog.stores);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(defaults?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const [askToAdd, setAskToAdd] = useState<{ productId: string; href: string } | null>(null);

  const form = useForm<CreateProductInput, unknown, CreateProductOutput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { ...EMPTY, ...defaults, purchaseDate: defaults?.purchaseDate ?? todayISO() },
  });
  const registerPurchase = useWatch({ control: form.control, name: "registerPurchase" });
  const nameValue = useWatch({ control: form.control, name: "name" });

  // Libera a URL temporária da pré-visualização ao trocar a foto ou sair da tela
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  function onImageChange(file: File | null) {
    setImageError(null);
    if (!file) return;
    if (!PRODUCT_IMAGE_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_TYPES)[number])) {
      setImageError("Envie uma foto em JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setImageError("A foto deve ter no máximo 2 MB.");
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    setImage(file);
    setRemoveImage(false);
  }

  function handleResult(result: ActionResult<InventoryChangeResult | null>, productId: string, inventoryItemId: string) {
    if (!result.ok) {
      setError(result.error);
      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (key in EMPTY && messages?.[0]) form.setError(key as keyof CreateProductInput, { message: messages[0] });
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    toast.success(result.message);
    const href = `/armario/${inventoryItemId}`;
    if (result.data?.added_to_list) toast.info("O produto está sem estoque e foi adicionado à lista Tem que comprar.");
    if (result.data?.ask_to_add) {
      setAskToAdd({ productId, href });
      return;
    }
    router.push(href);
  }

  /** A validação do navegador já passou; enviamos os valores digitados e o servidor valida de novo. */
  function onSubmit() {
    const values = form.getValues();
    setError(null);
    const formData = new FormData();
    if (image) formData.set("image", image);

    startTransition(async () => {
      if (mode === "create") {
        formData.set("data", JSON.stringify(values));
        const result = await createProductAction(formData);
        if (result.ok) handleResult(result, result.data.product_id, result.data.inventory_item_id);
        else handleResult(result, "", "");
      } else {
        formData.set(
          "data",
          JSON.stringify({ ...values, inventoryItemId: defaults?.inventoryItemId, productId: defaults?.productId }),
        );
        formData.set("removeImage", String(removeImage));
        const result = await updateProductAction(formData);
        handleResult(result, defaults?.productId ?? "", defaults?.inventoryItemId ?? "");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto grid max-w-2xl gap-4" noValidate>
        <FormAlert message={error} />

        <Card>
          <CardHeader>
            <CardTitle>Produto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Arroz branco" autoFocus={mode === "create"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <NativeSelect {...field} value={field.value ?? ""}>
                        <option value="">Sem categoria</option>
                        {catalog.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de barras (opcional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" maxLength={14} placeholder="Somente números" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-2">
              <span className="text-sm font-medium">Foto (opcional)</span>
              <div className="flex items-center gap-3">
                {preview && !removeImage ? (
                  // Pré-visualização local (blob:) ou URL pública do Storage
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Pré-visualização da foto" className="size-20 rounded-lg border object-cover" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    <ImagePlus className="size-6" aria-hidden />
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      Escolher foto
                      <input
                        type="file"
                        accept={PRODUCT_IMAGE_TYPES.join(",")}
                        className="sr-only"
                        onChange={(e) => onImageChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </Button>
                  {preview && !removeImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImage(null);
                        setPreview(null);
                        setRemoveImage(true);
                      }}
                    >
                      <Trash2 /> Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP com até 2 MB.</p>
              {imageError && <p className="text-sm text-destructive">{imageError}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque em casa</CardTitle>
            <CardDescription>Quando a quantidade chega ao mínimo, o produto aparece como acabando.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="currentQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade atual</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} value={String(field.value ?? "")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minimumQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade mínima</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} value={String(field.value ?? "")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="controlUnit"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Unidade de controle</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        {CONTROL_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="storageLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local de armazenamento</FormLabel>
                    <FormControl>
                      <NativeSelect {...field} value={field.value ?? ""}>
                        <option value="">Não informado</option>
                        {catalog.locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Embalagem</CardTitle>
            <CardDescription>Usada para calcular o preço por kg, litro ou unidade.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="packageSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso ou volume</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="Ex.: 5" {...field} value={String(field.value ?? "")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="packageUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <NativeSelect {...field} value={field.value ?? ""}>
                      <option value="">Selecione</option>
                      {PACKAGE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitsPerPackage"
              render={({ field }) => (
                <FormItem className="col-span-2 sm:col-span-1">
                  <FormLabel>Unidades na embalagem</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} value={String(field.value ?? "")} />
                  </FormControl>
                  <FormDescription>Ex.: fardo com 12 garrafas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {mode === "create" && (
          <Card>
            <CardHeader>
              <FormField
                control={form.control}
                name="registerPurchase"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="grid gap-1">
                      <FormLabel className="text-base font-semibold">Registrar compra</FormLabel>
                      <FormDescription>Salva o preço pago no histórico de preços.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardHeader>
            {registerPurchase && (
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço pago (por embalagem)</FormLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                            R$
                          </span>
                          <FormControl>
                            <Input inputMode="decimal" placeholder="0,00" className="pl-10" {...field} value={field.value ?? ""} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchasePackages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade comprada</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mercado</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <NativeSelect {...field} value={field.value ?? ""}>
                              <option value="">Selecione</option>
                              {stores.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </NativeSelect>
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Cadastrar mercado"
                            onClick={() => setStoreDialogOpen(true)}
                          >
                            <Plus />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da compra</FormLabel>
                        <FormControl>
                          <Input type="date" max={todayISO()} {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Opcional" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {mode === "create" ? "Cadastrar produto" : "Salvar alterações"}
          </Button>
        </div>
      </form>

      <StoreFormDialog
        open={storeDialogOpen}
        onOpenChange={setStoreDialogOpen}
        onSaved={(store) => {
          setStores((current) => [...current, store].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
          form.setValue("storeId", store.id, { shouldValidate: true });
        }}
      />

      <AskAddToListDialog
        open={Boolean(askToAdd)}
        productName={nameValue || "O produto"}
        onOpenChange={(open) => {
          if (!open && askToAdd) {
            router.push(askToAdd.href);
            setAskToAdd(null);
          }
        }}
        onConfirm={async () => {
          if (!askToAdd) return;
          const result = await addProductToListAction(askToAdd.productId, "out_of_stock");
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
        }}
      />
    </Form>
  );
}
