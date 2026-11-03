import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABEL, type Priority } from "@/lib/constants/domain";

const VARIANT: Record<Priority, "secondary" | "outline" | "warning" | "danger"> = {
  low: "outline",
  normal: "secondary",
  high: "warning",
  urgent: "danger",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={VARIANT[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}
