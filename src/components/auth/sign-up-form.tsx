"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormAlert } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: SignUpInput) {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(values);
      if (!result) return;
      if (!result.ok) setError(result.error);
      else setSentTo(values.email);
    });
  }

  if (sentTo) {
    return (
      <div className="grid gap-3 text-center">
        <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
        <p className="font-medium">Confirme seu e-mail</p>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong className="text-foreground">{sentTo}</strong>. Abra o e-mail para
          ativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormAlert message={error} />
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>Mínimo de 8 caracteres, com letras e números.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar senha</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Criar conta
        </Button>
      </form>
    </Form>
  );
}
