import { z } from "zod";

const email = z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase().max(254);

const password = z
  .string()
  .min(8, { error: "A senha deve ter pelo menos 8 caracteres." })
  .max(72, { error: "A senha deve ter no máximo 72 caracteres." })
  .regex(/[A-Za-z]/, { error: "A senha deve conter pelo menos uma letra." })
  .regex(/\d/, { error: "A senha deve conter pelo menos um número." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Informe a senha." }).max(72),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, { error: "Informe seu nome." }).max(120),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.input<typeof loginSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
