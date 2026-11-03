import type { Metadata } from "next";

import { Comparator } from "@/components/comparator/comparator";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Comparador" };

export default function ComparatorPage() {
  return (
    <>
      <PageHeader title="Comparador" description="Descubra qual embalagem sai mais barata por kg, litro ou unidade." />
      <Comparator />
    </>
  );
}
