import type { StockStatus } from "@/lib/constants/domain";

/**
 * Regras 1, 2 e 3. Mesma lógica da função private.compute_stock_status
 * no banco, que é a fonte oficial (trigger em inventory_items).
 */
export function computeStockStatus(currentQuantity: number, minimumQuantity: number): StockStatus {
  if (currentQuantity <= 0) return "out_of_stock";
  if (currentQuantity <= minimumQuantity) return "low_stock";
  return "available";
}
