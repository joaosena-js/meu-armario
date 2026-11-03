"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Pergunta exibida quando a inclusão automática está desativada (regra 4). */
export function AskAddToListDialog({
  open,
  productName,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  productName: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{productName} acabou</AlertDialogTitle>
          <AlertDialogDescription>Deseja adicionar este produto à lista Tem que comprar?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Adicionar à lista</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
