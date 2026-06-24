"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id, Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FinancialSummaryFooter } from "@/components/ui/financial-summary-footer";
import { LineItemsTable } from "@/components/ui/line-items-table";
import { OrderAddItemDrawer } from "./order-add-item-drawer";
import { toastManager } from "@/components/ui/toast";
import {
  Car01Icon,
  UserIcon,
  Alert01Icon,
  PlusSignIcon,
  Delete02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "hugeicons-react";
import { PrintTemplateButton } from "@/components/documentos/print-template-button";

type OrderItem = {
  id: string;
  type: "part" | "labor" | "service";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type WorkOrderDoc = Doc<"work_orders"> & {
  clientName?: string;
  clientData?: { name?: string; phone?: string; email?: string } | null;
  vehicleData?: { make?: string; model?: string; plate?: string; mileage?: number } | null;
};

interface CotizacionDetailsDrawerProps {
  order: WorkOrderDoc;
  trigger: React.ReactElement;
  onConverted?: () => void;
}

export function CotizacionDetailsDrawer({ order, trigger, onConverted }: CotizacionDetailsDrawerProps) {
  const [mainOpen, setMainOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<OrderItem | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateItems = useMutation(api.work_orders.updateItems);
  const convertToOrden = useMutation(api.work_orders.convertToOrden);
  const removeOrder = useMutation(api.work_orders.remove);
  const settings = useQuery(api.organizations.settings, order?.orgId ? { orgId: order.orgId } : "skip");

  const items: OrderItem[] = (order.items ?? []) as OrderItem[];
  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const taxRate = settings?.taxRate ?? 15;
  const iva = subtotal * (taxRate / 100);
  const total = subtotal + iva;

  const handleRemoveItem = async (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    try {
      await updateItems({ id: order._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el ítem." });
    }
  };

  const handleQuantitySubmit = async (itemId: string, quantity: number) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, quantity, total: quantity * item.unitPrice } : item
    );
    try {
      await updateItems({ id: order._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar la cantidad." });
    }
  };

  const handleUnitPriceSubmit = async (itemId: string, unitPrice: number) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, unitPrice, total: item.quantity * unitPrice } : item
    );
    try {
      await updateItems({ id: order._id, items: updatedItems });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el precio." });
    }
  };

  const handleConvert = async () => {
    try {
      await convertToOrden({ id: order._id });
      toastManager.add({ type: "success", title: "Convertida a ODT", description: "La cotización ahora es una orden de trabajo activa." });
      setConvertDialogOpen(false);
      setMainOpen(false);
      onConverted?.();
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo convertir la cotización." });
    }
  };

  const handleDelete = async () => {
    try {
      await removeOrder({ id: order._id });
      toastManager.add({ type: "success", title: "Cotización eliminada", description: "" });
      setDeleteDialogOpen(false);
      setMainOpen(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar la cotización." });
    }
  };

  const cotNum = order.number ?? "?";
  const clientName = order.clientName ?? order.clientData?.name ?? "Sin cliente";
  const vehicleLabel = order.vehicleData
    ? `${order.vehicleData.make ?? ""} ${order.vehicleData.model ?? ""}`.trim()
    : (order.vehicle ?? "Sin vehículo");

  return (
    <>
      <Drawer position="right" open={mainOpen} onOpenChange={setMainOpen}>
        <DrawerTrigger render={trigger} nativeButton={false} />
        <DrawerPopup variant="inset" className="max-w-xl">

          {/* Header */}
          <DrawerHeader className="border-b pb-3">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1.5">
                <DrawerTitle className="flex items-center gap-2 text-lg">
                  Cotización #{cotNum}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-semibold border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    Proforma
                  </span>
                </DrawerTitle>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Car01Icon className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{vehicleLabel}</span>
                    {order.vehicleData?.plate && (
                      <span className="font-mono bg-muted/50 px-1 rounded border uppercase">
                        {order.vehicleData.plate}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{clientName}</span>
                  </span>
                </div>
              </div>

              <DrawerClose render={
                <button title="Cerrar Panel" className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors mt-0.5 ml-1">
                  <Cancel01Icon className="h-5 w-5" />
                </button>
              } />
            </div>
          </DrawerHeader>

          {/* Content */}
          <DrawerPanel className="overflow-y-auto space-y-6">

            {/* Symptoms */}
            {(order.symptoms || order.inspection) && (
              <div className="bg-destructive/5 border border-destructive/10 p-3 rounded-lg text-sm text-destructive-foreground mt-4">
                <p className="font-medium flex items-center gap-1 mb-2">
                  <Alert01Icon className="h-4 w-4" /> Motivo / descripción
                </p>
                <div className="space-y-1.5 text-muted-foreground">
                  {order.symptoms?.split("\n").map((s, i) => {
                    const text = s.trim();
                    if (!text) return null;
                    return <p key={i}>{text.startsWith("-") ? text : `- ${text}`}</p>;
                  })}
                </div>
                {order.inspection && (
                  <p className="mt-2 text-muted-foreground">{order.inspection}</p>
                )}
              </div>
            )}

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Ítems de la cotización</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setItemToEdit(null); setAddItemOpen(true); }}
                >
                  <PlusSignIcon className="h-3.5 w-3.5 mr-1" />
                  Añadir Ítem
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/20">
                  No hay repuestos ni servicios en esta cotización.
                </p>
              ) : (
                <LineItemsTable
                  items={items}
                  editable
                  onItemClick={(item) => { setItemToEdit(item); setAddItemOpen(true); }}
                  onRemoveItem={handleRemoveItem}
                  onQuantitySubmit={handleQuantitySubmit}
                  onUnitPriceSubmit={handleUnitPriceSubmit}
                  showType
                  getUnitPrice={(item) => item.unitPrice}
                  getTotal={(item) => item.total}
                />
              )}
            </div>
          </DrawerPanel>

          {/* Footer */}
          <DrawerFooter className="border-t pt-4">
            <FinancialSummaryFooter
              subtotal={subtotal}
              iva={iva}
              balance={total}
              taxRate={taxRate}
            >
              <PrintTemplateButton
                kind="cotizacion"
                id={String(order._id)}
                orgId={String(order.orgId)}
                label="Imprimir"
              />

              <Button
                className="w-full gap-1.5"
                onClick={() => setConvertDialogOpen(true)}
              >
                <ArrowRight01Icon className="h-4 w-4" /> Convertir a ODT
              </Button>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Button
                  type="button"
                  className="w-full text-destructive hover:bg-destructive/10 border-destructive/20"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Delete02Icon className="mr-2 h-4 w-4" /> Eliminar
                </Button>
                <AlertDialogPopup>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará COT-{String(cotNum).padStart(4, "0")} permanentemente. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose render={<Button variant="ghost" type="button">Cancelar</Button>} />
                    <Button variant="destructive" onClick={handleDelete}>Sí, eliminar</Button>
                  </AlertDialogFooter>
                </AlertDialogPopup>
              </AlertDialog>
            </FinancialSummaryFooter>
          </DrawerFooter>
        </DrawerPopup>

        {/* Nested drawer must live inside Drawer to keep zoom effect */}
        <OrderAddItemDrawer
          entityId={order._id}
          entityType="order"
          orgId={order.orgId}
          items={items}
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          itemToEdit={itemToEdit}
        />
      </Drawer>

      {/* Convert confirmation — outside Drawer so it doesn't get zoomed */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Convertir a Orden de Trabajo?</AlertDialogTitle>
            <AlertDialogDescription>
              La cotización <strong>COT-{String(cotNum).padStart(4, "0")}</strong> se convertirá en una ODT activa. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost">Cancelar</Button>} />
            <Button onClick={handleConvert}>Convertir a ODT</Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
