import { Package } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <span className={cn("relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="96px" className="object-cover" unoptimized />
      ) : (
        <Package className="size-6 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}
