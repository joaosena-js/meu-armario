"use client";

import { AlertTriangle, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { compareOptions, type ComparatorOption } from "@/lib/calculations/comparator";
import { MEASURE_GROUP_LABEL, MEASURE_GROUP_OF, referenceUnitLabel } from "@/lib/calculations/units";
import { PACKAGE_UNITS, type PackageUnit } from "@/lib/constants/domain";
import { formatCents, formatNumber, formatPercent, formatReferencePriceCents } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { comparatorOptionSchema } from "@/lib/validations/comparator";

type OptionValues = {
  name: string;
  brand: string;
  price: string;
  packageSize: string;
  packageUnit: PackageUnit;
  packagesCount: string;
};

const emptyOption = (index: number): OptionValues => ({
  name: `Opção ${String.fromCharCode(65 + index)}`,
  brand: "",
  price: "",
  packageSize: "",
  packageUnit: "kg",
  packagesCount: "1",
});

export function Comparator() {
  const form = useForm<{ options: OptionValues[] }>({ defaultValues: { options: [emptyOption(0), emptyOption(1)] } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "options" });
  const values = useWatch({ control: form.control, name: "options" });

  // Converte apenas as opções preenchidas corretamente
  const parsed = useMemo(() => {
    const valid: ComparatorOption[] = [];
    const errors: Record<number, string> = {};
    values.forEach((option, index) => {
      const touched = option.price || option.packageSize;
      if (!touched) return;
      const result = comparatorOptionSchema.safeParse(option);
      if (!result.success) {
        errors[index] = result.error.issues[0].message;
        return;
      }
      valid.push({
        id: String(index),
        name: result.data.name || `Opção ${index + 1}`,
        brand: result.data.brand ?? undefined,
        priceCents: result.data.price,
        packageSize: result.data.packageSize,
        packageUnit: result.data.packageUnit,
        packagesCount: result.data.packagesCount,
      });
    });
    return { valid, errors };
  }, [values]);

  const result = parsed.valid.length >= 2 ? compareOptions(parsed.valid) : null;
  const byId = result?.ok ? new Map(result.options.map((o) => [o.id, o])) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="grid gap-3">
        {fields.map((field, index) => {
          const computed = byId?.get(String(index));
          const isBest = result?.ok && result.bestValueId === String(index);
          return (
            <Card key={field.id} className={cn("gap-3 py-4", isBest && "border-primary ring-1 ring-primary")}>
              <CardContent className="grid gap-3 px-4">
                <div className="flex items-center gap-2">
                  <Input aria-label="Nome ou descrição" className="font-semibold" {...form.register(`options.${index}.name`)} />
                  {fields.length > 2 && (
                    <Button variant="ghost" size="icon" aria-label="Remover opção" onClick={() => remove(index)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                    <Label htmlFor={`brand-${index}`}>Marca</Label>
                    <Input id={`brand-${index}`} placeholder="Opcional" {...form.register(`options.${index}.brand`)} />
                  </div>
                  <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                    <Label htmlFor={`price-${index}`}>Preço total</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input id={`price-${index}`} inputMode="decimal" placeholder="0,00" className="pl-10" {...form.register(`options.${index}.price`)} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`size-${index}`}>Peso, volume ou qtd.</Label>
                    <Input id={`size-${index}`} inputMode="decimal" placeholder="Ex.: 5" {...form.register(`options.${index}.packageSize`)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`unit-${index}`}>Unidade</Label>
                    <NativeSelect id={`unit-${index}`} {...form.register(`options.${index}.packageUnit`)}>
                      {PACKAGE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="col-span-2 grid gap-1.5">
                    <Label htmlFor={`count-${index}`}>Quantidade de embalagens</Label>
                    <Input id={`count-${index}`} inputMode="numeric" {...form.register(`options.${index}.packagesCount`)} />
                  </div>
                </div>
                {parsed.errors[index] && <p className="text-sm text-destructive">{parsed.errors[index]}</p>}
                {computed && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="font-semibold">
                      {formatReferencePriceCents(computed.pricePerReferenceCents, computed.referenceUnit)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(computed.totalReferenceQuantity)} {computed.referenceUnit === "unidade" ? "un." : computed.referenceUnit} no total
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={() => append(emptyOption(fields.length))} disabled={fields.length >= 10}>
            <Plus /> Adicionar opção
          </Button>
          <Button variant="ghost" size="lg" onClick={() => form.reset({ options: [emptyOption(0), emptyOption(1)] })}>
            <RotateCcw /> Limpar
          </Button>
        </div>
      </div>

      <aside aria-live="polite" className="lg:sticky lg:top-8">
        {!result && (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Preencha preço e embalagem de pelo menos duas opções para ver o resultado. Compare apenas produtos da mesma medida:
              peso (g e kg), volume (ml e L) ou quantidade (unidade).
            </CardContent>
          </Card>
        )}
        {result && !result.ok && result.reason === "incompatible_units" && (
          <Card className="border-warning">
            <CardContent className="flex gap-3 text-sm">
              <AlertTriangle className="size-5 shrink-0 text-warning-strong" aria-hidden />
              <p>
                Não é possível comparar {result.groups?.map((g) => MEASURE_GROUP_LABEL[g].toLowerCase()).join(" com ")}. Use a mesma
                medida em todas as opções.
              </p>
            </CardContent>
          </Card>
        )}
        {result?.ok && (
          <Card>
            <CardContent className="grid gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-strong">
                  <Trophy className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Melhor custo-benefício</p>
                  <p className="text-lg font-semibold">{byId!.get(result.bestValueId)!.name}</p>
                  <p className="text-sm">
                    {formatReferencePriceCents(byId!.get(result.bestValueId)!.pricePerReferenceCents, byId!.get(result.bestValueId)!.referenceUnit)}
                  </p>
                </div>
              </div>
              {result.savingsPercent > 0 && (
                <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success-strong">
                  {formatPercent(result.savingsPercent)} mais econômico por {referenceUnitLabel(byId!.get(result.bestValueId)!.referenceUnit)} que a
                  opção mais cara.
                </p>
              )}
              <dl className="grid gap-2 text-sm">
                <ResultRow label="Menor preço total" option={byId!.get(result.lowestTotalPriceId)!.name} value={formatCents(byId!.get(result.lowestTotalPriceId)!.priceCents)} />
                <ResultRow
                  label={`Menor preço por ${referenceUnitLabel(byId!.get(result.bestValueId)!.referenceUnit)}`}
                  option={byId!.get(result.bestValueId)!.name}
                  value={formatReferencePriceCents(byId!.get(result.bestValueId)!.pricePerReferenceCents, byId!.get(result.bestValueId)!.referenceUnit)}
                />
                <ResultRow
                  label="Maior embalagem"
                  option={byId!.get(result.largestPackageId)!.name}
                  value={`${formatNumber(byId!.get(result.largestPackageId)!.totalReferenceQuantity)} ${byId!.get(result.largestPackageId)!.referenceUnit === "unidade" ? "un." : byId!.get(result.largestPackageId)!.referenceUnit}`}
                />
                <ResultRow label="Economia" option="" value={formatPercent(result.savingsPercent)} />
              </dl>
              <ul className="grid gap-1 border-t pt-3 text-sm">
                {[...result.options]
                  .sort((a, b) => a.pricePerReferenceExact - b.pricePerReferenceExact)
                  .map((o) => (
                    <li key={o.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {o.name}
                        {o.id === result.bestValueId && (
                          <Badge variant="success" className="ml-2">
                            Melhor
                          </Badge>
                        )}
                      </span>
                      <span className="tabular-nums">{formatReferencePriceCents(o.pricePerReferenceCents, o.referenceUnit)}</span>
                    </li>
                  ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Grupo de medida: {MEASURE_GROUP_LABEL[MEASURE_GROUP_OF[result.options[0].packageUnit]]}. Valores convertidos com 1 kg = 1.000 g e
                1 L = 1.000 ml.
              </p>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}

function ResultRow({ label, option, value }: { label: string; option: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">
        <span className="font-medium">{value}</span>
        {option && <span className="block text-xs text-muted-foreground">{option}</span>}
      </dd>
    </div>
  );
}
