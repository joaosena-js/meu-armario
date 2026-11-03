import { STOCK_STATUS_LABEL, type StockStatus } from "@/lib/constants/domain";
import { Badge } from "@/components/ui/badge";

const VARIANT: Record<StockStatus, "success" | "warning" | "danger"> = {
  available: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

const DOT: Record<StockStatus, string> = {
  available: "bg-success",
  low_stock: "bg-warning",
  out_of_stock: "bg-danger",
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant={VARIANT[status]}>
      <span className={`size-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {STOCK_STATUS_LABEL[status]}
    </Badge>
  );
}
