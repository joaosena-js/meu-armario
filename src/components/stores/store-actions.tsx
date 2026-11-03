"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteStoreAction } from "@/actions/stores";
import { StoreFormDialog } from "@/components/stores/store-form-dialog";
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
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";

export function NewStoreButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" className="w-full md:w-auto" onClick={() => setOpen(true)}>
        <Plus /> Cadastrar mercado
      </Button>
      <StoreFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function StoreDetailActions({ store, canDelete }: { store: Tables<"stores">; canDelete: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil /> Editar
      </Button>
      {canDelete && (
        <Button variant="ghost" className="text-destructive" onClick={() => setDeleteOpen(true)} disabled={pending}>
          <Trash2 /> Excluir
        </Button>
      )}
      <StoreFormDialog open={editOpen} onOpenChange={setEditOpen} store={store} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {store.name}?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteStoreAction(store.id);
                  if (result.ok) {
                    toast.success(result.message);
                    router.push("/mercados");
                  } else {
                    toast.error(result.error);
                  }
                })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
