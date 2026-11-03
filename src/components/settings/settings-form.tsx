"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { signOutAction } from "@/actions/auth";
import { updateSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { THEME_LABEL, THEMES } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";
import { settingsSchema, type SettingsInput } from "@/lib/validations/settings";

export function SettingsForm({ defaults, email }: { defaults: SettingsInput; email: string | null }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: defaults });

  function onSubmit(values: SettingsInput) {
    setError(null);
    startTransition(async () => {
      const result = await updateSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTheme(values.theme);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto grid max-w-2xl gap-4" noValidate>
        <FormAlert message={error} />
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            {email && <CardDescription>{email}</CardDescription>}
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista Tem que comprar</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <FormField
              control={form.control}
              name="automaticallyAddOutOfStock"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="grid gap-1">
                    <FormLabel>Adicionar automaticamente quando acabar</FormLabel>
                    <FormDescription>Se desativado, o sistema pergunta antes de adicionar.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="automaticallyAddLowStock"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="grid gap-1">
                    <FormLabel>Adicionar automaticamente quando estiver acabando</FormLabel>
                    <FormDescription>Quando a quantidade chegar ao mínimo definido no produto.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Tema</FormLabel>
                  <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
                    {THEMES.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        role="radio"
                        aria-checked={field.value === theme}
                        onClick={() => field.onChange(theme)}
                        className={cn(
                          "h-12 rounded-lg border px-2 text-sm font-medium",
                          field.value === theme ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                        )}
                      >
                        {THEME_LABEL[theme]}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar configurações
        </Button>
      </form>

      <div className="mx-auto mt-6 max-w-2xl border-t pt-6">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            <LogOut /> Sair da conta
          </Button>
        </form>
      </div>
    </Form>
  );
}
