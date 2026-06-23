"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@convex/_generated/api";
import { type Doc } from "@convex/_generated/dataModel";
import {
  Drawer,
  DrawerClose,
  DrawerPanel,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Invoice01Icon,
  Cancel01Icon,
  PlusSignIcon,
  ShoppingCart01Icon,
  Delete01Icon,
} from "hugeicons-react";
import { toastManager } from "@/components/ui/toast";
import { FinancialSummaryFooter } from "@/components/ui/financial-summary-footer";
import { PurchaseAddItemDrawer } from "@/components/compras/purchase-add-item-drawer";
import { PurchasePaymentsDrawer } from "@/components/compras/purchase-payments-drawer";
import { LineItemsTable } from "@/components/ui/line-items-table";
import { PrintTemplateButton } from "@/components/documentos/print-template-button";

type PurchaseDoc = Doc<"purchases">;
type PurchaseItem = NonNullable<PurchaseDoc["items"]>[number];

interface PurchaseDetailsDrawerProps {
  purchase: PurchaseDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseDetailsDrawer({ purchase, open, onOpenChange }: PurchaseDetailsDrawerProps) {
  const closePurchase = useMutation(api.purchases.closePurchase);
  const cancelPurchase = useMutation(api.purchases.cancel);
  const updateItems   = useMutation(api.purchases.updateItems);
  const removePurchase = useMutation(api.purchases.remove);
  const settings = useQuery(api.organizations.settings, purchase?.orgId ? { orgId: purchase.orgId } : "skip");

  const [addItemOpen, setAddItemOpen]   = useState(false);
  const [paymentOpen, setPaymentOpen]   = useState(false);
  const [itemToEdit, setItemToEdit]     = useState<PurchaseItem | null>(null);
  const [confirmOpen, setConfirmOpen]   = useState(false);

  const items    = purchase?.items    || [];
  const payments = purchase?.payments || [];
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxRate  = settings?.taxRate ?? 15;
  const iva      = subtotal * (taxRate / 100);
  const total    = subtotal + iva;
  const pagado   = payments.reduce((acc, pay) => acc + pay.amount, 0);
  const balance  = total - pagado;

  const handleStatusChange = async (newStatus: "Recibida" | "Cancelada") => {
    if (!purchase) return;
    try {
      if (newStatus === "Recibida") {
        await closePurchase({ id: purchase._id });
      } else {
        await cancelPurchase({ id: purchase._id });
      }
      toastManager.add({ type: "success", title: "Estado actualizado", description: `Compra marcada como ${newStatus}.` });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el estado." });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!purchase) return;
    const updatedItems = items.filter((i) => i.id !== itemId);
    try {
      await updateItems({ id: purchase._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el item." });
    }
  };

  const handleQuantitySubmit = async (itemId: string, quantity: number) => {
    if (!purchase) return;
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, quantity, total: quantity * item.unitCost } : item,
    );
    try {
      await updateItems({ id: purchase._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar la cantidad." });
    }
  };

  const handleUnitPriceSubmit = async (itemId: string, unitPrice: number) => {
    if (!purchase) return;
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, unitCost: unitPrice, total: item.quantity * unitPrice } : item,
    );
    try {
      await updateItems({ id: purchase._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el costo." });
    }
  };

  return (
    <>
      <Drawer position="right" open={open} onOpenChange={onOpenChange}>
        <DrawerPopup variant="inset" className="max-w-xl">

          {/* Header */}
          <DrawerHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShoppingCart01Icon className="h-5 w-5" />
                </div>
                <div>
                  <DrawerTitle className="flex items-center gap-2">
                    {purchase ? `Fac #${purchase.number || 'S/N'}` : "Compra"}
                      {purchase && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        purchase.status === "Cancelada"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                          : purchase.status === "Borrador"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      }`}>
                        {purchase.status}
                      </span>
                    )}
                  </DrawerTitle>
                  {purchase && <p className="text-sm text-muted-foreground mt-0.5">{purchase.supplierName}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <button
                    title="Eliminar o Anular compra"
                    onClick={() => setConfirmOpen(true)}
                    className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                  >
                    <Delete01Icon className="h-4 w-4" />
                  </button>
                  <AlertDialogPopup>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar o Anular compra?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Eliminar borrará el registro. Anular dejará el registro como &quot;Cancelada&quot; y revertirá el stock solo si la compra ya fue cerrada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button variant="ghost" type="button" onClick={() => setConfirmOpen(false)}>
                        Cerrar
                      </Button>
                      <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={async () => {
                        if (!purchase) return;
                        try {
                          await handleStatusChange("Cancelada");
                          setConfirmOpen(false);
                        } catch {}
                      }}>Anular Compra</Button>
                      <Button variant="destructive" onClick={async () => {
                        if (!purchase) return;
                        try {
                          await removePurchase({ id: purchase._id });
                          toastManager.add({ type: "success", title: "Compra eliminada", description: "La compra ha sido borrada exitosamente." });
                          onOpenChange(false);
                        } catch {
                          toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar la compra." });
                        }
                        setConfirmOpen(false);
                      }}>Sí, eliminar permanentemente</Button>
                    </AlertDialogFooter>
                  </AlertDialogPopup>
                </AlertDialog>

                <DrawerClose render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" />}>
                  <Cancel01Icon className="h-4 w-4" />
                </DrawerClose>
              </div>
            </div>
          </DrawerHeader>

          {/* Panel con scroll */}
          <DrawerPanel className="space-y-6 !pt-6">
            {purchase ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Detalle de Compra</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setItemToEdit(null); setAddItemOpen(true); }}
                      disabled={purchase.status !== "Borrador"}
                    >
                      <PlusSignIcon className="h-3.5 w-3.5 mr-1" />
                      Añadir Ítem
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/20">
                      No hay productos en esta factura.
                    </p>
                  ) : (
                    <LineItemsTable
                      items={items}
                      editable={purchase.status === "Borrador"}
                      onItemClick={(item) => {
                        if (purchase.status === "Borrador") {
                          setItemToEdit(item as PurchaseItem);
                          setAddItemOpen(true);
                        }
                      }}
                      onRemoveItem={purchase.status === "Borrador" ? handleRemoveItem : undefined}
                      onQuantitySubmit={purchase.status === "Borrador" ? handleQuantitySubmit : undefined}
                      onUnitPriceSubmit={purchase.status === "Borrador" ? handleUnitPriceSubmit : undefined}
                      priceLabel="Costo"
                      getUnitPrice={(item) => item.unitCost}
                      getTotal={(item) => item.total}
                    />
                  )}
                </div>


              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Cargando compra...
              </div>
            )}
          </DrawerPanel>

          {/* Footer */}
          {purchase && (
            <DrawerFooter className="border-t pt-4">
              <FinancialSummaryFooter
                subtotal={subtotal}
                iva={iva}
                balance={balance}
                taxRate={taxRate}
              >
                <Button
                  className="w-full"
                  onClick={() => setPaymentOpen(true)}
                  disabled={purchase.status !== "Recibida"}
                >
                  <Invoice01Icon className="h-4 w-4 mr-1.5" />
                  Pagos
                </Button>

                {purchase && <PrintTemplateButton kind="compra" id={String(purchase._id)} orgId={String(purchase.orgId)} label="Imprimir" />}
                {purchase.status === "Borrador" ? (
                  <Button
                    variant="default"
                    className="w-full border-emerald-600 bg-emerald-600 text-white shadow-none hover:border-emerald-700 hover:bg-emerald-700 focus-visible:ring-emerald-500/40"
                    onClick={() => handleStatusChange("Recibida")}
                    disabled={items.length === 0}
                  >
                    Finalizar compra
                  </Button>
                ) : null}
              </FinancialSummaryFooter>
            </DrawerFooter>
          )}
        </DrawerPopup>

        {/* Nested Drawers — dentro del Drawer principal para el efecto zoom */}
        {purchase && (
          <>
            <PurchaseAddItemDrawer
              purchase={purchase}
              open={addItemOpen}
              onOpenChange={setAddItemOpen}
              itemToEdit={itemToEdit}
            />
            <PurchasePaymentsDrawer
              purchase={purchase}
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
