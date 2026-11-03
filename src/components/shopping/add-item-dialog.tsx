"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { addShoppingItemAction } from "@/actions/shopping-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CONTROL_UNITS, PRIORITIES, PRIORITY_LABEL } from "@/lib/constants/domain";
import type { ProductOption } from "@/lib/queries/catalog";
import { addShoppingItemSchema, type AddShoppingItemInput } from "@/lib/validations/shopping-list";

const DEFAULTS: AddShoppingItemInput = {
  productId: "",
  customName: "",
  preferredBrand: "",
  desiredQuantity: "1",
  unit: "unidade",
  priority: "normal",
  notes: "",
};

export function AddItemDialog({
  open,
  onOpenChange,
  products,
  pendingProductIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  pendingProductIds: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<AddShoppingItemInput>({ resolver: zodResolver(addShoppingItemSchema), defaultValues: DEFAULTS });
  const productId = useWatch({ control: form.control, name: "productId" });
  const available = products.filter((p) => !pendingProductIds.includes(p.id));

  function onSubmit(values: AddShoppingItemInput) {
    setError(null);
    startTransition(async () => {
      const result = await addShoppingItemAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      form.reset(DEFAULTS);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à lista</DialogTitle>
          <DialogDescription>Escolha um produto que você já comprou ou digite um nome novo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormAlert message={error} />
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto cadastrado</FormLabel>
                  <FormControl>
                    <NativeSelect
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        field.onChange(e);
                        const product = products.find((p) => p.id === e.target.value);
                        if (product) form.setValue("unit", product.unit);
                      }}
                    >
                      <option value="">Produto novo (digitar nome)</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.brand ? ` (${p.brand})` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormControl>
                  {available.length < products.length && (
                    <FormDescription>Produtos que já estão na lista não aparecem aqui.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {!productId && (
              <FormField
                control={form.control}
                name="customName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Café" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormDescription>O produto é cadastrado no armário quando você comprá-lo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="preferredBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca preferida (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="desiredQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} value={String(field.value ?? "")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
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
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <FormControl>
                    <NativeSelect {...field}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABEL[p]}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
