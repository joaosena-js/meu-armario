/**
 * Valores de domínio. No banco ficam em inglês (ver restrições CHECK nas
 * migrations); aqui ficam os rótulos exibidos na interface.
 */

export const CONTROL_UNITS = ["unidade", "pacote", "caixa", "garrafa", "lata", "frasco"] as const;
export type ControlUnit = (typeof CONTROL_UNITS)[number];

export const CONTROL_UNIT_PLURAL: Record<ControlUnit, string> = {
  unidade: "unidades",
  pacote: "pacotes",
  caixa: "caixas",
  garrafa: "garrafas",
  lata: "latas",
  frasco: "frascos",
};

export const PACKAGE_UNITS = ["g", "kg", "ml", "L", "unidade"] as const;
export type PackageUnit = (typeof PACKAGE_UNITS)[number];

export const STOCK_STATUSES = ["available", "low_stock", "out_of_stock"] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  available: "Disponível",
  low_stock: "Acabando",
  out_of_stock: "Acabou",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

/** Ordem usada para ordenar a lista: urgente primeiro. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export const LIST_REASONS = ["out_of_stock", "low_stock", "manual"] as const;
export type ListReason = (typeof LIST_REASONS)[number];

export const LIST_REASON_LABEL: Record<ListReason, string> = {
  out_of_stock: "Produto acabou",
  low_stock: "Estoque baixo",
  manual: "Adicionado manualmente",
};

export const THEMES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];

export const THEME_LABEL: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Igual ao aparelho",
};

/** Usados apenas como referência; o banco cria os padrões no cadastro. */
export const DEFAULT_CATEGORIES = [
  "Alimentos",
  "Bebidas",
  "Higiene pessoal",
  "Limpeza",
  "Medicamentos",
  "Cuidados com animais",
  "Papelaria",
  "Outros",
] as const;

export const DEFAULT_STORAGE_LOCATIONS = [
  "Armário",
  "Despensa",
  "Geladeira",
  "Freezer",
  "Banheiro",
  "Lavanderia",
  "Outros",
] as const;

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
