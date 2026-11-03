"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addProductToListAction,
  adjustQuantityAction,
  deleteInventoryItemAction,
  markLowStockAction,
  markOutOfStockAction,
} from "@/actions/inventory";
import type { ActionResult, InventoryChangeResult } from "@/types/domain";

/** Ações de um item do armário, com o tratamento da regra 4 (pergunta ou inclusão automática). */
export function useInventoryActions(item: { id: string; productId: string; productName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [askOpen, setAskOpen] = useState(false);

  function handleChange(result: ActionResult<InventoryChangeResult>, successMessage?: string) {
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const change = result.data;
    if (change.added_to_list) {
      toast.success(`${item.productName} acabou e foi adicionado à lista Tem que comprar.`);
    } else if (change.ask_to_add) {
      setAskOpen(true);
    } else if (change.status === "out_of_stock" && change.previous_status !== "out_of_stock" && change.already_in_list) {
      toast.info(`${item.productName} acabou. Ele já está na lista Tem que comprar.`);
    } else if (successMessage) {
      toast.success(successMessage);
    }
    router.refresh();
  }

  return {
    pending,
    askOpen,
    setAskOpen,
    adjust(delta: number) {
      startTransition(async () => handleChange(await adjustQuantityAction(item.id, delta)));
    },
    markLow() {
      startTransition(async () => handleChange(await markLowStockAction(item.id), "Marcado como acabando."));
    },
    markOut() {
      startTransition(async () => handleChange(await markOutOfStockAction(item.id), "Marcado como acabou."));
    },
    addToList() {
      startTransition(async () => {
        const result = await addProductToListAction(item.productId);
        if (result.ok) {
          if (result.data.created) toast.success(result.message);
          else toast.info(result.message);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    },
    remove(onDone?: () => void) {
      startTransition(async () => {
        const result = await deleteInventoryItemAction(item.id);
        if (result.ok) {
          toast.success(result.message);
          onDone?.();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      });
    },
  };
}
