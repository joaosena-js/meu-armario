"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { saveStoreAction } from "@/actions/stores";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storeSchema, type StoreInput } from "@/lib/validations/store";

type StoreValues = { name: string; address: string; neighborhood: string; city: string; notes: string };

export function StoreFormDialog({
  open,
  onOpenChange,
  store,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store?: { id: string } & Partial<Record<keyof StoreValues, string | null>>;
  onSaved?: (store: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    values: {
      name: store?.name ?? "",
      address: store?.address ?? "",
      neighborhood: store?.neighborhood ?? "",
      city: store?.city ?? "",
      notes: store?.notes ?? "",
    },
  });

  function onSubmit(values: StoreInput) {
    setError(null);
    startTransition(async () => {
      const result = await saveStoreAction(values, store?.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      onSaved?.({ id: result.data.id, name: values.name.trim() });
      onOpenChange(false);
      form.reset();
      router.refresh();
    });
  }

  const textFields: { name: keyof StoreValues; label: string; autoComplete?: string }[] = [
    { name: "address", label: "Endereço (opcional)", autoComplete: "street-address" },
    { name: "neighborhood", label: "Bairro (opcional)" },
    { name: "city", label: "Cidade (opcional)", autoComplete: "address-level2" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{store ? "Editar mercado" : "Cadastrar mercado"}</DialogTitle>
          <DialogDescription>Os mercados são usados no modo de compras e no histórico de preços.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormAlert message={error} />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do mercado</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {textFields.map((f) => (
              <FormField
                key={f.name}
                control={form.control}
                name={f.name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.label}</FormLabel>
                    <FormControl>
                      <Input autoComplete={f.autoComplete} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
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
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
