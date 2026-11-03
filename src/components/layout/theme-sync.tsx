"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import type { ThemePreference } from "@/lib/constants/domain";

/** Aplica o tema salvo nas configurações da conta ao abrir o app em outro aparelho. */
export function ThemeSync({ theme }: { theme: ThemePreference }) {
  const { theme: current, setTheme } = useTheme();
  useEffect(() => {
    if (current && current !== theme) setTheme(theme);
    // Executa apenas quando a preferência salva muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return null;
}
