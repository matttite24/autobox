"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { VehicleDetailsSheet } from "../vehiculos/vehicle-details-sheet";
import { ClientDetailsSheet } from "../clientes/client-details-sheet";
import { OrderPaymentsDrawer } from "./order-payments-drawer";
import { OrderAddItemDrawer } from "./order-add-item-drawer";
import { OrderMileageDrawer } from "./order-mileage-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
import { toastManager } from "@/components/ui/toast";
import { DatilInvoiceModal } from "@/components/facturacion/datil-invoice-modal";
import { PrintTemplateButton } from "@/components/documentos/print-template-button";
import {
  Car01Icon,
  UserIcon,
  UserSettings01Icon,
  Alert01Icon,
  PlusSignIcon,
  Delete02Icon,
  PencilEdit01Icon,
  Cancel01Icon,
  Wallet02Icon,
  DashboardSpeed01Icon,
  NoteEditIcon,
  Note01Icon,
  FloppyDiskIcon,
  ClipboardIcon,
} from "hugeicons-react";
import { OrdenForm } from "@/components/ordenes/orden-form";
import { LineItemsTable } from "@/components/ui/line-items-table";

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30",
  "En Progreso": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  "Listo": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  "Entregado": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  "Pendiente": "Recepción",
  "En Progreso": "En Reparación",
  "Listo": "Terminado",
  "Entregado": "Entregado",
};

type OrderItem = {
  id: string;
  type: "part" | "labor" | "service";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type OrderPayment = {
  id: string;
  amount: number;
  method: "Efectivo" | "Tarjeta" | "Transferencia";
  date: number;
  reference?: string;
};

type VehicleSummary = {
  make?: string;
  model?: string;
};

type ClientSummary = {
  name?: string;
  documentId?: string;
  email?: string;
  phone?: string;
};

type OrderDetails = {
  _id: Id<"work_orders">;
  orgId: Id<"organizations">;
  number?: number;
  status: "Pendiente" | "En Progreso" | "Listo" | "Entregado" | "Completada" | "Cancelada";
  clientId: Id<"clients">;
  clientName: string;
  clientData?: Record<string, unknown> | null;
  vehicleId?: Id<"vehicles">;
  vehicle?: string;
  vehicleData?: { make?: string; model?: string; plate?: string; color?: string; } | null;
  symptoms?: string;
  symptomsChecked?: number[];
  issue?: string;
  inspection?: string;
  mileage?: number;
  nextMileage?: number;
  items?: OrderItem[];
  payments?: OrderPayment[];
  facturacionStatus?: "pendiente" | "enviando" | "enviada" | "error";
  facturacionLabel?: string;
  assignedWorkerId?: Id<"clients">;
  assignedWorkerData?: { name: string; jobTitle?: string } | null;
  estimatedDeliveryDate?: number;
};

export function OrderDetailsDrawer({ order, trigger, initialOpen = false }: { order: OrderDetails, trigger?: React.ReactNode, initialOpen?: boolean }) {
  const updateItems = useMutation(api.work_orders.updateItems);
  const updateSymptoms = useMutation(api.work_orders.updateSymptoms);
  const updateInspection = useMutation(api.work_orders.updateInspection);
  const updateSymptomsChecked = useMutation(api.work_orders.updateSymptomsChecked);
  const updateStatus = useMutation(api.work_orders.updateStatus);
  const removeWorkOrder = useMutation(api.work_orders.remove);
  const settings = useQuery(api.organizations.settings, order?.orgId ? { orgId: order.orgId } : "skip");
  const [mainOpen, setMainOpen] = useState(initialOpen);
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingSymptom, setIsAddingSymptom] = useState(false);
  const [newSymptomText, setNewSymptomText] = useState("");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<OrderItem | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mileageOpen, setMileageOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [motivosOpen, setMotivosOpen] = useState(false);
  const [isEditingInspection, setIsEditingInspection] = useState(false);
  const [inspectionText, setInspectionText] = useState(order.inspection || "");

  const items = order.items || [];
  const payments = order.payments || [];

  // Keyboard shortcut to open the "Add Item" nested drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      
      if (mainOpen && !addItemOpen && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setItemToEdit(null);
        setAddItemOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mainOpen, addItemOpen]);

  const handleAddSymptom = async () => {
    if (!newSymptomText.trim()) return;
    const currentSymptoms = order.symptoms || "";
    const newSymptoms = currentSymptoms 
      ? `${currentSymptoms}\n- ${newSymptomText.trim()}`
      : `- ${newSymptomText.trim()}`;
      
    try {
      await updateSymptoms({
        id: order._id,
        symptoms: newSymptoms
      });
      setNewSymptomText("");
      setIsAddingSymptom(false);
      toastManager.add({ type: "success", title: "Motivo añadido", description: "Se ha registrado el nuevo motivo de ingreso." });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo añadir el motivo." });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const updatedItems = items.filter((i) => i.id !== itemId);
    try {
      await updateItems({
        id: order._id,
        items: updatedItems,
      });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el item." });
    }
  };

  const handleQuantitySubmit = async (itemId: string, quantity: number) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, quantity, total: quantity * item.unitPrice } : item,
    );
    try {
      await updateItems({
        id: order._id,
        items: updatedItems,
      });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar la cantidad." });
    }
  };

  const handleUnitPriceSubmit = async (itemId: string, unitPrice: number) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, unitPrice, total: item.quantity * unitPrice } : item,
    );
    try {
      await updateItems({
        id: order._id,
        items: updatedItems,
      });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el precio." });
    }
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxRate = settings?.taxRate ?? 15;
  const iva = subtotal * (taxRate / 100);
  const total = subtotal + iva;
  const totalPagado = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const balance = total - totalPagado;
  const isFacturada = order.facturacionStatus === "enviada";

  return (
    <>
      <Drawer position="right" open={mainOpen} onOpenChange={setMainOpen}>
        {trigger && <DrawerTrigger render={trigger as any} nativeButton={false} />}
        <DrawerPopup variant="inset" className="max-w-xl">
        
        {/* Main Drawer Header */}
        <DrawerHeader className="border-b pb-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <DrawerTitle className="flex items-center gap-2 text-lg">
                Orden de Trabajo #{order.number || "?"}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-semibold border ${STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                {isFacturada && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-widest font-semibold border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                    {order.facturacionLabel || "Facturado"}
                  </span>
                )}
              </DrawerTitle>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <button
                  onClick={() => { if (order.vehicleData) setVehicleSheetOpen(true); }}
                  className={`flex items-center gap-1 transition-colors ${order.vehicleData ? "hover:text-primary cursor-pointer" : "cursor-default"}`}
                >
                  <Car01Icon className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {order.vehicleData ? `${order.vehicleData.make} ${order.vehicleData.model}` : order.vehicle}
                  </span>
                  {order.vehicleData?.plate && (
                    <span className="font-mono bg-muted/50 px-1 rounded border uppercase">{order.vehicleData.plate}</span>
                  )}
                </button>
                <button
                  onClick={() => { if (order.clientData) setClientSheetOpen(true); }}
                  className={`flex items-center gap-1 transition-colors ${order.clientData ? "hover:text-primary cursor-pointer" : "cursor-default"}`}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{order.clientName}</span>
                </button>
              </div>

            </div>

            <div className="flex items-center">
              <button 
                title="Seguimiento de Aceite" 
                onClick={() => { setMileageOpen(true); }}
                className="p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-500 rounded-md transition-colors mt-0.5"
              >
                <DashboardSpeed01Icon className="h-5 w-5" />
              </button>
              {order.status !== "Cancelada" && (
                <button 
                  title="Editar Orden" 
                  onClick={() => { setMainOpen(false); setIsEditing(true); }}
                  className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors mt-0.5"
                >
                  <PencilEdit01Icon className="h-5 w-5" />
                </button>
              )}
              

              <DrawerClose render={
                <button title="Cerrar Panel" className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors mt-0.5 ml-1">
                  <Cancel01Icon className="h-5 w-5" />
                </button>
              } />
            </div>
          </div>
        </DrawerHeader>

        {/* Main Drawer Content */}
        <DrawerPanel className="overflow-y-auto space-y-6 !pt-4">

          {/* Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Cotización / Trabajos</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setItemToEdit(null);
                  setAddItemOpen(true);
                }}
                disabled={order.status === "Completada" || order.status === "Cancelada"}
              >
                <PlusSignIcon className="h-3.5 w-3.5 mr-1" />
                Añadir Ítem
              </Button>
            </div>
            
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg bg-muted/20">
                No hay repuestos ni mano de obra agregados a esta orden.
              </p>
            ) : (
            <LineItemsTable
              items={items}
              editable={order.status !== "Cancelada" && order.status !== "Completada"}
              onItemClick={(item) => {
                if (order.status !== "Cancelada") {
                  setItemToEdit(item);
                  setAddItemOpen(true);
                }
              }}
              onRemoveItem={order.status !== "Cancelada" && order.status !== "Completada" ? handleRemoveItem : undefined}
              onQuantitySubmit={order.status !== "Cancelada" && order.status !== "Completada" ? handleQuantitySubmit : undefined}
              onUnitPriceSubmit={order.status !== "Cancelada" && order.status !== "Completada" ? handleUnitPriceSubmit : undefined}
              showType
              getUnitPrice={(item) => item.unitPrice}
              getTotal={(item) => item.total}
            />
            )}
          </div>
          
        </DrawerPanel>

        {/* Fila sobre el footer: técnico + entrega + ver motivos */}
        <div className="shrink-0 flex items-center gap-3 text-xs text-muted-foreground border-t px-4 py-2 flex-wrap">
          {order.assignedWorkerData && (
            <span className="flex items-center gap-1">
              <UserSettings01Icon className="h-3.5 w-3.5 shrink-0" />
              <span>Técnico</span>
              <span className="text-foreground font-medium">{order.assignedWorkerData.name}</span>
            </span>
          )}
          {order.estimatedDeliveryDate && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="font-medium">Entrega</span>
              <span>{new Date(order.estimatedDeliveryDate).toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short" })}</span>
            </span>
          )}
          <button
            onClick={() => setMotivosOpen(true)}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardIcon className="h-3.5 w-3.5" />
            Ver datos
          </button>
        </div>

        {/* Main Drawer Footer */}
        <DrawerFooter className="border-t pt-4">
          <FinancialSummaryFooter
            subtotal={subtotal}
            iva={iva}
            balance={balance}
            taxRate={taxRate}
          >
              <Button
                className="w-full"
                variant={balance > 0 ? "default" : "secondary"}
                onClick={() => setPaymentOpen(true)}
                disabled={order.status === "Cancelada"}
              >
                <Wallet02Icon className="mr-2 h-4 w-4" /> Pagos
              </Button>

              <PrintTemplateButton kind="orden" id={String(order._id)} orgId={String(order.orgId)} label="Imprimir" />

              {order.status === "Completada" && (
                <DatilInvoiceModal
                  orgId={order.orgId}
                  sourceType="orden"
                  sourceId={String(order._id)}
                  label={`Orden #${order.number || "?"}`}
                  title="Enviar orden a facturar"
                  summary={[
                    { label: "Cliente", value: order.clientName },
                    { label: "Vehículo", value: order.vehicleData ? `${(order.vehicleData as VehicleSummary).make ?? ""} ${(order.vehicleData as VehicleSummary).model ?? ""}`.trim() : order.vehicle || "N/A" },
                    { label: "Total", value: `$${total.toFixed(2)}` },
                    { label: "Saldo", value: `$${balance.toFixed(2)}` },
                  ]}
                  trigger={<Button className="w-full">Facturar</Button>}
                />
              )}

              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Button
                  type="button"
                  className="w-full text-destructive hover:bg-destructive/10 border-destructive/20"
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                >
                  {order.status === "Cancelada" ? (
                    <><Delete02Icon className="mr-2 h-4 w-4" /> Eliminar</>
                  ) : (
                    <><Cancel01Icon className="mr-2 h-4 w-4" /> Anular</>
                  )}
                </Button>
                <AlertDialogPopup>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{order.status === "Cancelada" ? "¿Eliminar orden de trabajo?" : "¿Anular Orden?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {order.status === "Cancelada" 
                        ? "Esta acción es irreversible. Se eliminará el registro, junto con todos sus repuestos y servicios cotizados." 
                        : "Esta acción marcará la orden de trabajo como anulada. Ya no se podrán hacer modificaciones. ¿Estás seguro de continuar?"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose render={<Button variant="ghost" type="button">Regresar</Button>} />
                    <AlertDialogClose
                      render={<Button variant="destructive" type="button">{order.status === "Cancelada" ? "Sí, eliminar" : "Sí, anular"}</Button>}
                      onClick={async () => {
                        try {
                          if (order.status === "Cancelada") {
                            await removeWorkOrder({ id: order._id });
                            toastManager.add({ type: "success", title: "Orden eliminada", description: "La orden ha sido borrada exitosamente." });
                            setMainOpen(false);
                          } else {
                            await updateStatus({ id: order._id, status: "Cancelada" });
                            toastManager.add({ type: "success", title: "Orden anulada" });
                          }
                        } catch {
                          toastManager.add({ type: "error", title: "Error", description: order.status === "Cancelada" ? "No se pudo eliminar la orden" : "No se pudo anular la orden" });
                        }
                        setConfirmOpen(false);
                      }}
                    />
                  </AlertDialogFooter>
                </AlertDialogPopup>
              </AlertDialog>
          </FinancialSummaryFooter>
        </DrawerFooter>
        </DrawerPopup>

        {/* Sub-drawer: Datos de ingreso */}
        <Drawer position="right" open={motivosOpen} onOpenChange={(v) => { setMotivosOpen(v); if (!v) { setIsAddingSymptom(false); setNewSymptomText(""); setIsEditingInspection(false); } }}>
          <DrawerPopup variant="inset" className="max-w-sm">
            <DrawerHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <DrawerTitle className="flex items-center gap-2 text-base">
                  <ClipboardIcon className="h-4 w-4 text-muted-foreground" />
                  Datos de ingreso
                </DrawerTitle>
                <DrawerClose render={
                  <button className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors">
                    <Cancel01Icon className="h-4 w-4" />
                  </button>
                } />
              </div>
            </DrawerHeader>
            <DrawerPanel className="overflow-y-auto p-4 space-y-6 !pt-4">

              {/* Motivos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Note01Icon className="h-3.5 w-3.5" /> Motivos de ingreso
                  </p>
                  {order.status !== "Cancelada" && !isAddingSymptom && (
                    <button
                      onClick={() => setIsAddingSymptom(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <PlusSignIcon className="h-3.5 w-3.5" /> Añadir
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(order.symptoms || order.issue) ? (
                    (order.symptoms || order.issue)!.split('\n').map((s, i) => {
                      const text = s.trim();
                      if (!text) return null;
                      const clean = text.startsWith('-') ? text.slice(1).trim() : text;
                      const checked = (order.symptomsChecked ?? []).includes(i);
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${checked ? "bg-muted/60 border-muted" : "bg-muted/30"}`}
                        >
                          <button
                            onClick={async () => {
                              const current = order.symptomsChecked ?? [];
                              const next = checked ? current.filter(n => n !== i) : [...current, i];
                              await updateSymptomsChecked({ id: order._id, symptomsChecked: next });
                            }}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              checked
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-muted-foreground/40 hover:border-emerald-400"
                            }`}
                          >
                            {checked && (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`leading-snug flex-1 ${checked ? "line-through text-muted-foreground" : ""}`}>
                            {clean}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                      Sin motivos registrados.
                    </div>
                  )}
                </div>

                {order.status !== "Cancelada" && (
                  isAddingSymptom ? (
                    <div className="flex gap-2 items-center mt-3">
                      <Input
                        value={newSymptomText}
                        onChange={(e) => setNewSymptomText(e.target.value)}
                        placeholder="Escribe el motivo..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); }
                          if (e.key === 'Escape') { setIsAddingSymptom(false); setNewSymptomText(""); }
                        }}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setIsAddingSymptom(false); setNewSymptomText(""); }}>
                        <Cancel01Icon className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="h-8 shrink-0" onClick={handleAddSymptom}>OK</Button>
                    </div>
                  ) : null
                )}
              </div>

              {/* Inspección */}
              <div className="border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <NoteEditIcon className="h-3.5 w-3.5" /> Inspección inicial
                  </p>
                  {order.status !== "Cancelada" && !isEditingInspection && (
                    <button
                      onClick={() => { setInspectionText(order.inspection || ""); setIsEditingInspection(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <PencilEdit01Icon className="h-3.5 w-3.5" /> Editar
                    </button>
                  )}
                </div>

                {isEditingInspection ? (
                  <div className="space-y-2">
                    <textarea
                      value={inspectionText}
                      onChange={(e) => setInspectionText(e.target.value)}
                      placeholder="Describe la inspección inicial del vehículo..."
                      rows={5}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingInspection(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={async () => {
                        try {
                          await updateInspection({ id: order._id, inspection: inspectionText.trim() });
                          toastManager.add({ type: "success", title: "Inspección guardada" });
                          setIsEditingInspection(false);
                        } catch {
                          toastManager.add({ type: "error", title: "Error", description: "No se pudo guardar la inspección." });
                        }
                      }}>
                        <FloppyDiskIcon className="h-3.5 w-3.5" /> Guardar
                      </Button>
                    </div>
                  </div>
                ) : order.inspection ? (
                  <div className="rounded-lg border bg-muted/30 px-3 py-3 text-sm leading-relaxed whitespace-pre-line">
                    {order.inspection}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                    Sin inspección registrada.{" "}
                    {order.status !== "Cancelada" && (
                      <button onClick={() => { setInspectionText(""); setIsEditingInspection(true); }} className="underline hover:text-foreground transition-colors">Añadir</button>
                    )}
                  </div>
                )}
              </div>

            </DrawerPanel>
          </DrawerPopup>
        </Drawer>

        <OrderAddItemDrawer
          entityId={order._id}
          entityType="order"
          orgId={order.orgId}
          items={items}
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          orderStatus={order.status}
          itemToEdit={itemToEdit}
        />

        <OrderPaymentsDrawer
          entityId={order._id}
          entityType="order"
          payments={payments}
          saldo={balance}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
        />

        <OrderMileageDrawer 
          orderId={order._id}
          currentMileage={order.mileage}
          nextMileage={order.nextMileage}
          open={mileageOpen}
          onOpenChange={setMileageOpen}
        />
      </Drawer>

      <OrdenForm 
        trigger={null}
        open={isEditing} 
        onOpenChange={(val) => {
          setIsEditing(val);
          if (!val) setMainOpen(true);
        }} 
        orderToEdit={order} 
      />

      <VehicleDetailsSheet 
        vehicle={order.vehicleData as any} 
        client={order.clientData as any}
        open={vehicleSheetOpen} 
        onOpenChange={setVehicleSheetOpen} 
      />

      <ClientDetailsSheet 
        client={order.clientData as any}
        open={clientSheetOpen} 
        onOpenChange={setClientSheetOpen} 
      />
    </>
  );
}
