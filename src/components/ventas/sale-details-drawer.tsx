"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CheckmarkCircle01Icon,
  PlusSignIcon,
  ShoppingBag01Icon,
  Delete01Icon,
} from "hugeicons-react";
import { toastManager } from "@/components/ui/toast";
import { FinancialSummaryFooter } from "@/components/ui/financial-summary-footer";
import { OrderAddItemDrawer } from "@/components/ordenes/order-add-item-drawer";
import { OrderPaymentsDrawer } from "@/components/ordenes/order-payments-drawer";
import { DatilInvoiceModal } from "@/components/facturacion/datil-invoice-modal";
import { LineItemsTable } from "@/components/ui/line-items-table";
import { PrintTemplateButton } from "@/components/documentos/print-template-button";

type SaleDoc = Doc<"sales">;
type SaleItem = NonNullable<SaleDoc["items"]>[number];

interface SaleDetailsDrawerProps {
  sale: SaleDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsDrawer({ sale, open, onOpenChange }: SaleDetailsDrawerProps) {
  const updateStatus  = useMutation(api.sales.updateStatus);
  const updateItems   = useMutation(api.sales.updateItems);
  const removeSale    = useMutation(api.sales.remove);
  const settings = useQuery(api.organizations.settings, sale?.orgId ? { orgId: sale.orgId } : "skip");

  const [addItemOpen, setAddItemOpen]   = useState(false);
  const [paymentOpen, setPaymentOpen]   = useState(false);
  const [itemToEdit, setItemToEdit]     = useState<SaleItem | null>(null);
  const [confirmOpen, setConfirmOpen]   = useState(false);

  const items    = sale?.items    || [];
  const payments = sale?.payments || [];
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxRate  = settings?.taxRate ?? 15;
  const iva      = subtotal * (taxRate / 100);
  const total    = subtotal + iva;
  const pagado   = payments.reduce((acc, pay) => acc + pay.amount, 0);
  const balance  = total - pagado;
  const createdAtLabel = sale ? format(new Date(sale._creationTime), "dd/MM/yyyy") : "";
  const isFacturada = sale?.facturacionStatus === "enviada";

  const handleStatusChange = async (newStatus: "Pendiente" | "Completada" | "Cancelada") => {
    if (!sale) return;
    try {
      await updateStatus({ id: sale._id, status: newStatus });
      toastManager.add({ type: "success", title: "Estado actualizado", description: `Venta marcada como ${newStatus}.` });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el estado." });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!sale) return;
    const updatedItems = items.filter((i) => i.id !== itemId);
    try {
      await updateItems({ id: sale._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el item." });
    }
  };

  const handleQuantitySubmit = async (itemId: string, quantity: number) => {
    if (!sale) return;
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, quantity, total: quantity * item.unitPrice } : item,
    );
    try {
      await updateItems({ id: sale._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar la cantidad." });
    }
  };

  const handleUnitPriceSubmit = async (itemId: string, unitPrice: number) => {
    if (!sale) return;
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, unitPrice, total: item.quantity * unitPrice } : item,
    );
    try {
      await updateItems({ id: sale._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el precio." });
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
                  <ShoppingBag01Icon className="h-5 w-5" />
                </div>
                <div>
                  <DrawerTitle className="flex items-center gap-2">
                    {sale ? `Venta #${sale.number}` : "Venta"}
                    {sale && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        sale.status === "Completada" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" :
                        sale.status === "Cancelada"  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" :
                        "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      }`}>
                        {sale.status}
                      </span>
                    )}
                    {isFacturada && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {sale.facturacionLabel ?? "Facturado"}
                      </span>
                    )}
                  </DrawerTitle>
                  {sale && <p className="text-sm text-muted-foreground mt-0.5">{sale.clientName}</p>}
                  {sale && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fecha de creación: {createdAtLabel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <button
                    title="Eliminar venta"
                    onClick={() => setConfirmOpen(true)}
                    className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                  >
                    <Delete01Icon className="h-4 w-4" />
                  </button>
                  <AlertDialogPopup>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción es irreversible. Se eliminará el registro junto con todos sus ítems y pagos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogClose render={<Button variant="ghost" type="button">Cancelar</Button>} />
                      <AlertDialogClose
                        render={<Button variant="destructive" type="button">Sí, eliminar</Button>}
                        onClick={async () => {
                          if (!sale) return;
                          try {
                            await removeSale({ id: sale._id });
                            toastManager.add({ type: "success", title: "Venta eliminada", description: "La venta ha sido borrada exitosamente." });
                            onOpenChange(false);
                          } catch {
                            toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar la venta." });
                          }
                          setConfirmOpen(false);
                        }}
                      />
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
            {sale ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Detalle de Venta</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setItemToEdit(null); setAddItemOpen(true); }}
                      disabled={sale.status !== "Pendiente"}
                    >
                      <PlusSignIcon className="h-3.5 w-3.5 mr-1" />
                      Añadir Ítem
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/20">
                      No hay repuestos ni servicios en esta venta.
                    </p>
                  ) : (
                    <LineItemsTable
                      items={items}
                      editable={sale.status === "Pendiente"}
                      onItemClick={(item) => {
                        setItemToEdit(item);
                        setAddItemOpen(true);
                      }}
                      onRemoveItem={sale.status === "Pendiente" ? handleRemoveItem : undefined}
                      onQuantitySubmit={sale.status === "Pendiente" ? handleQuantitySubmit : undefined}
                      onUnitPriceSubmit={sale.status === "Pendiente" ? handleUnitPriceSubmit : undefined}
                      showType
                      getUnitPrice={(item) => item.unitPrice}
                      getTotal={(item) => item.total}
                    />
                  )}
                </div>


              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Cargando venta...
              </div>
            )}
          </DrawerPanel>

          {/* Footer */}
          {sale && (
            <DrawerFooter className="border-t pt-4">
              <FinancialSummaryFooter
                subtotal={subtotal}
                iva={iva}
                balance={balance}
                taxRate={taxRate}
              >
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
                  onClick={() => handleStatusChange("Completada")}
                  disabled={sale.status !== "Pendiente" || balance > 0.01 || items.length === 0}
                >
                  <CheckmarkCircle01Icon className="h-4 w-4 mr-1.5" />
                  Completar
                </Button>

                <Button
                  className="w-full"
                  onClick={() => setPaymentOpen(true)}
                  disabled={sale.status !== "Pendiente" || balance <= 0}
                >
                  <Invoice01Icon className="h-4 w-4 mr-1.5" />
                  Pagos
                </Button>

                {sale && (
                  <div className="grid grid-cols-2 gap-2">
                    <PrintTemplateButton kind="venta" id={String(sale._id)} orgId={String(sale.orgId)} label="Imprimir" />
                    <PrintTemplateButton kind="ticket" id={String(sale._id)} orgId={String(sale.orgId)} label="Ticket" variant="ghost" />
                  </div>
                )}

                {sale.status === "Completada" && (
                  <DatilInvoiceModal
                    orgId={sale.orgId}
                    sourceType="venta"
                    sourceId={sale._id}
                    label={`Venta #${sale.number ?? "S/N"}`}
                    title="Enviar venta a facturar"
                    summary={[
                      { label: "Cliente", value: sale.clientName },
                      { label: "Total", value: `$${total.toFixed(2)}` },
                      { label: "Pagado", value: `$${pagado.toFixed(2)}` },
                      { label: "Saldo", value: `$${balance.toFixed(2)}` },
                    ]}
                    trigger={<Button className="w-full">Facturar</Button>}
                  />
                )}
              </FinancialSummaryFooter>
            </DrawerFooter>
          )}
        </DrawerPopup>

        {/* Nested Drawers — dentro del Drawer principal para el efecto zoom */}
        {sale && (
          <>
            <OrderAddItemDrawer
              entityId={sale._id}
              entityType="sale"
              orgId={sale.orgId}
              items={items}
              open={addItemOpen}
              onOpenChange={setAddItemOpen}
              itemToEdit={itemToEdit}
            />
            <OrderPaymentsDrawer
              entityId={sale._id}
              entityType="sale"
              payments={payments}
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
              saldo={balance}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
