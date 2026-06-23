"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { OrdenForm } from "@/components/ordenes/orden-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Doc, Id } from "@convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter,
} from "@/components/ui/card";
import { Car01Icon, Alert01Icon, UserIcon, PlusSignIcon } from "hugeicons-react";
import { toastManager } from "@/components/ui/toast";
import { OrderDetailsDrawer } from "@/components/ordenes/order-details-drawer";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type WorkOrderDoc = Doc<"work_orders">;

type WorkOrderVehicleData = {
  make?: string;
  model?: string;
  plate?: string;
  color?: string;
};
type WorkOrderView = WorkOrderDoc & {
  clientName: string;
  clientPhone?: string;
  clientData?: Record<string, unknown> | null;
  vehicleData?: WorkOrderVehicleData | null;
};

type WorkOrderItem = NonNullable<WorkOrderDoc["items"]>[number];
type WorkOrderPayment = NonNullable<WorkOrderDoc["payments"]>[number];

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-500/30",
  "En Progreso": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  "Listo": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/30",
  "Entregado": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
  "Cancelada": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30"
};

const COLOR_MAP: Record<string, string> = {
  "Blanco": "#e5e7eb", // slightly gray to be visible in both themes
  "Negro": "#1a1a1a",
  "Gris": "#6b7280",
  "Plata": "#c0c0c0",
  "Rojo": "#dc2626",
  "Azul": "#2563eb",
  "Verde": "#16a34a",
  "Amarillo": "#ca8a04",
  "Naranja": "#ea580c",
  "Café": "#78350f",
  "Beige": "#d4b483",
};

const STATUSES = [
  { id: "Pendiente", label: "Recepción", color: STATUS_COLORS["Pendiente"], accent: "bg-slate-500" },
  { id: "En Progreso", label: "En Reparación", color: STATUS_COLORS["En Progreso"], accent: "bg-blue-500" },
  { id: "Listo", label: "Terminado", color: STATUS_COLORS["Listo"], accent: "bg-emerald-500" },
  { id: "Entregado", label: "Entregado", color: STATUS_COLORS["Entregado"], accent: "bg-purple-500" }
];

const ADVANCE_COLORS: Record<string, string> = {
  "Pendiente":  "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
  "En Progreso":"bg-emerald-500 hover:bg-emerald-600 text-white border-transparent",
  "Listo":      "bg-indigo-500 hover:bg-indigo-600 text-white border-transparent",
};

const ACTIVE_STATUSES = new Set(["Pendiente", "En Progreso", "Listo", "Entregado"]);

export default function OrdenesPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orders = useQuery(api.work_orders.get, orgId ? { orgId } : "skip") as WorkOrderView[] | undefined;
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const updateStatus = useMutation(api.work_orders.updateStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<string>("Recientes");
  const [isFormOpen, setIsFormOpen] = useState(() => searchParams.get("new") === "1");
  const [showPaidView, setShowPaidView] = useState(false);
  const [initialOpenOrderId] = useState<string | null>(() => searchParams.get("orderId"));
  const [deliveryConfirmOrderId, setDeliveryConfirmOrderId] = useState<Id<"work_orders"> | null>(null);
  const [closeConfirmOrderId, setCloseConfirmOrderId] = useState<Id<"work_orders"> | null>(null);

  useEffect(() => {
    const isNew = searchParams.get("new") === "1";
    const hasOrderId = Boolean(searchParams.get("orderId"));
    if (isNew) {
      queueMicrotask(() => setIsFormOpen(true));
      router.replace("/ordenes", { scroll: false });
    } else if (hasOrderId) {
      router.replace("/ordenes", { scroll: false });
    }
  }, [searchParams, router]);

  useNewShortcut(() => setIsFormOpen(true));

  const handleAdvance = async (orderId: Id<"work_orders">, currentStatus: string) => {
    const currentIndex = STATUSES.findIndex(s => s.id === currentStatus);
    if (currentIndex < STATUSES.length - 1) {
      try {
        await updateStatus({ id: orderId, status: STATUSES[currentIndex + 1].id as any });
      } catch {
        toastManager.add({ type: "error", title: "Error", description: "No se pudo avanzar la orden." });
      }
    }
  };

  const handleRevert = async (orderId: Id<"work_orders">, currentStatus: string) => {
    const currentIndex = STATUSES.findIndex(s => s.id === currentStatus);
    if (currentIndex > 0) {
      try {
        await updateStatus({ id: orderId, status: STATUSES[currentIndex - 1].id as any });
      } catch {
        toastManager.add({ type: "error", title: "Error", description: "No se pudo regresar la orden." });
      }
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return orders;
    const term = debouncedSearchTerm.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      if (!ACTIVE_STATUSES.has(order.status)) return false;
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;

      const plate = order.vehicleData?.plate?.toLowerCase() ?? "";
      const vehicleName = order.vehicleData ? `${order.vehicleData.make} ${order.vehicleData.model}`.toLowerCase() : (order.vehicle ?? "").toLowerCase();
      const number = String(order.number || "").toLowerCase();
      const clientName = order.clientName.toLowerCase();
      const symptoms = (order.symptoms || order.issue || "").toLowerCase();

      return [plate, vehicleName, number, clientName, symptoms].some((field) => field.includes(term));
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Recientes") return (b._creationTime || 0) - (a._creationTime || 0);
      if (sortBy === "Antiguas") return (a._creationTime || 0) - (b._creationTime || 0);
      
      const getOrderTotal = (order: WorkOrderView) => {
        const items = (order.items || []) as WorkOrderItem[];
        const subtotal = items.reduce((acc, item) => acc + item.total, 0);
        const taxRate = settings?.taxRate ?? 15;
        return subtotal + subtotal * (taxRate / 100);
      };
      
      if (sortBy === "Mayor Monto") return getOrderTotal(b) - getOrderTotal(a);
      if (sortBy === "Menor Monto") return getOrderTotal(a) - getOrderTotal(b);
      
      return 0;
    });
  }, [orders, debouncedSearchTerm, statusFilter, sortBy, settings?.taxRate]);

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Órdenes de Trabajo"
        mobileTitle="Órdenes"
        toolbar={
          <SearchFilterBar
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar por cliente, placa, vehículo, número o síntoma"
            isActive={!!searchTerm.trim() || statusFilter !== "Todos"}
            onClear={() => {
              setSearchTerm("");
              setStatusFilter("Todos");
            }}
            selectedOption={statusFilter === "Todos" ? "" : statusFilter}
            onSelectOption={(value) => setStatusFilter((value as string) || "Todos")}
            options={STATUSES.map((status) => ({ value: status.id, label: status.label }))}
          />
        }
      >
        <Select value={sortBy} onValueChange={(val: any) => { if (val) setSortBy(val as string); }}>
          <SelectTrigger className="w-[180px] bg-background shrink-0 hidden md:flex">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Recientes">Recientes primero</SelectItem>
            <SelectItem value="Antiguas">Más antiguas primero</SelectItem>
            <SelectItem value="Mayor Monto">Mayor monto</SelectItem>
            <SelectItem value="Menor Monto">Menor monto</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setIsFormOpen(true)}
          aria-label="Nueva orden"
        >
          <PlusSignIcon className="size-4" />
          <span className="hidden sm:inline">Nueva Orden</span>
        </Button>
        <OrdenForm open={isFormOpen} onOpenChange={setIsFormOpen} />
      </AppHeader>
      <main className="flex-1 px-6 pt-4 pb-0 flex flex-col gap-4 overflow-hidden min-w-0">
        <div className="flex-1 overflow-x-auto min-w-0">
          <div className="flex gap-4 min-w-max h-full pb-0">
            {STATUSES.map((status, index) => {
              const columnOrders = filteredOrders?.filter(o => o.status === status.id) || [];
              const prevStatus = index > 0 ? STATUSES[index - 1] : null;
              const nextStatus = index < STATUSES.length - 1 ? STATUSES[index + 1] : null;
              
              const columnTotal = columnOrders.reduce((sum, order) => {
                const items = (order.items || []) as WorkOrderItem[];
                const subtotal = items.reduce((acc: number, item) => acc + item.total, 0);
                const taxRate = settings?.taxRate ?? 15;
                const iva = subtotal * (taxRate / 100);
                return sum + subtotal + iva;
              }, 0);
              
              return (
                <div key={status.id} className="flex-1 min-w-[270px] flex flex-col gap-3">
                  
                  <div className="flex flex-col gap-1.5 pb-2 relative mb-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`size-2.5 rounded-full ${status.accent}`} />
                        <h2 className="font-semibold text-foreground tracking-tight">{status.label}</h2>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {columnOrders.length}
                        </span>
                      </div>
                      {columnTotal > 0 && (
                        <span className="text-sm font-bold text-muted-foreground tracking-tight">
                          ${columnTotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {/* Línea decorativa delgada para la columna */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-muted/40 overflow-hidden">
                      <div className={`h-full ${status.accent} opacity-80 w-full`} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 overflow-y-auto flex-1 px-1 pb-6 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {orders === undefined ? (
                      <>
                        <Skeleton className="h-36 w-full rounded-2xl" />
                        <Skeleton className="h-36 w-full rounded-2xl opacity-60" />
                        <Skeleton className="h-36 w-full rounded-2xl opacity-30" />
                      </>
                    ) : (
                      columnOrders.map((order) => {
                        const items = (order.items || []) as WorkOrderItem[];
                        const payments = (order.payments || []) as WorkOrderPayment[];
                        const subtotal = items.reduce((acc: number, item) => acc + item.total, 0);
                        const taxRate = settings?.taxRate ?? 15;
                        const iva = subtotal * (taxRate / 100);
                        const total = subtotal + iva;
                        const totalPagado = payments.reduce((acc: number, p) => acc + p.amount, 0);
                        const balance = total - totalPagado;
                        const balanceValue = Math.abs(balance);
                        const displayValue = showPaidView ? totalPagado : balanceValue;
                        const displayLabel = showPaidView
                          ? "Pagado"
                          : balance > 0
                            ? "Pendiente"
                            : balance < 0
                              ? "Saldo a favor"
                              : "Pagado";
                        const displayPrefix = showPaidView
                          ? "-"
                          : balance > 0
                            ? ""
                            : balance < 0
                              ? "-"
                              : "";
                        return (
                          <OrderDetailsDrawer
                            key={order._id}
                            order={order}
                            initialOpen={initialOpenOrderId === order._id}
                            trigger={
                              <div className="w-full text-left appearance-none focus:outline-none cursor-pointer">
                                <Card className="shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-150">
                                  {/* Header: vehículo + placa + síntoma */}
                                  <CardHeader className="pb-3 flex flex-col items-stretch">
                                    <CardTitle className="w-full text-sm font-semibold flex items-center justify-between gap-2 leading-tight mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Car01Icon 
                                          className="h-4 w-4 shrink-0" 
                                          style={{ color: order.vehicleData?.color ? COLOR_MAP[order.vehicleData.color] : "currentColor" }}
                                        />
                                        <span className="truncate">
                                          {order.vehicleData 
                                            ? `${order.vehicleData.make} ${order.vehicleData.model}` 
                                            : order.vehicle}
                                        </span>
                                        {order.vehicleData?.plate && (
                                          <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded">
                                            {order.vehicleData.plate}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                        #{order.number || "?"}
                                      </span>
                                    </CardTitle>

                                    <CardDescription className="col-span-2 text-xs line-clamp-2 leading-relaxed flex items-start gap-1.5">
                                      <Alert01Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/70" />
                                      {order.symptoms || order.issue}
                                    </CardDescription>
                                  </CardHeader>

                                  {/* Footer: cliente + total + botón avanzar */}
                                  <CardFooter className="border-t flex-col items-stretch gap-2 pt-3 pb-3 px-4">
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <UserIcon className="h-3.5 w-3.5 shrink-0" />
                                          <span className="truncate font-medium text-foreground">{order.clientName}</span>
                                        </div>
                                        {order.clientPhone && (
                                          <span className="text-xs text-muted-foreground pl-5 truncate">
                                            {order.clientPhone}
                                          </span>
                                        )}
                                      </div>
                                      {total > 0 && (
                                        <button
                                          type="button"
                                          className="flex flex-col items-end shrink-0 pl-2 text-right transition-opacity hover:opacity-80"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowPaidView((current) => !current);
                                          }}
                                          title={showPaidView ? "Ver saldo pendiente" : "Ver saldo pagado"}
                                        >
                                          <span className={`font-bold text-sm tabular-nums ${showPaidView ? 'text-emerald-600 dark:text-emerald-500' : balance === 0 ? 'text-emerald-600 dark:text-emerald-500' : balance > 0 ? 'text-primary' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                            {displayPrefix}${displayValue.toFixed(2)}
                                          </span>
                                          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
                                            {displayLabel}
                                          </span>
                                        </button>
                                      )}
                                    </div>

                                    {(prevStatus || nextStatus || order.status === "Entregado") && (
                                      <div className="flex gap-2 w-full mt-1">
                                        {prevStatus && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 flex-shrink-0 text-xs text-muted-foreground hover:text-foreground relative z-10 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRevert(order._id, order.status);
                                            }}
                                            title={`Regresar a ${prevStatus.label}`}
                                          >
                                            ←
                                          </Button>
                                        )}
                                        {order.status === "Entregado" ? (
                                          <AlertDialog open={closeConfirmOrderId === order._id} onOpenChange={(nextOpen) => setCloseConfirmOrderId(nextOpen ? order._id : null)}>
                                            <Button
                                              size="sm"
                                              className="flex-1 h-7 text-xs font-semibold transition-colors relative z-10 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setCloseConfirmOrderId(order._id);
                                              }}
                                            >
                                              Cerrar Orden ✓
                                            </Button>
                                            <AlertDialogPopup>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>¿Cerrar orden?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  La orden ya está entregada. Esta acción la deja como cerrada para que solo se vea en el historial.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <Button variant="ghost" onClick={() => setCloseConfirmOrderId(null)}>Cancelar</Button>
                                                <Button variant="ghost" className="bg-slate-800 hover:bg-slate-900 text-white hover:text-white dark:bg-slate-200 dark:hover:bg-slate-300 dark:text-slate-900" onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await updateStatus({ id: order._id, status: "Completada" });
                                                  setCloseConfirmOrderId(null);
                                                }}>Sí, Cerrar</Button>
                                              </AlertDialogFooter>
                                            </AlertDialogPopup>
                                          </AlertDialog>
                                        ) : nextStatus && order.status === "Listo" ? (
                                          <AlertDialog open={deliveryConfirmOrderId === order._id} onOpenChange={(nextOpen) => setDeliveryConfirmOrderId(nextOpen ? order._id : null)}>
                                            <Button
                                              size="sm"
                                              className={`flex-1 h-7 text-xs font-semibold transition-colors relative z-10 ${ADVANCE_COLORS[order.status] ?? ""}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeliveryConfirmOrderId(order._id);
                                              }}
                                            >
                                              Entregar Vehículo →
                                            </Button>
                                            <AlertDialogPopup>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>¿Confirmar entrega?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Asegúrate de haber cobrado todo el saldo pendiente antes de entregar el vehículo al cliente.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <Button variant="ghost" onClick={() => setDeliveryConfirmOrderId(null)}>Cancelar</Button>
                                                <Button
                                                  variant="ghost"
                                                  className="bg-indigo-500 hover:bg-indigo-600 text-white hover:text-white"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await handleAdvance(order._id, order.status);
                                                    setDeliveryConfirmOrderId(null);
                                                  }}
                                                >
                                                  Sí, Entregar
                                                </Button>
                                              </AlertDialogFooter>
                                            </AlertDialogPopup>
                                          </AlertDialog>
                                        ) : nextStatus ? (
                                          <Button
                                            size="sm"
                                            className={`flex-1 h-7 text-xs font-semibold transition-colors relative z-10 ${ADVANCE_COLORS[order.status] ?? ""}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAdvance(order._id, order.status);
                                            }}
                                          >
                                            Avanzar a {nextStatus.label} →
                                          </Button>
                                        ) : null}
                                      </div>
                                    )}
                                  </CardFooter>

                                </Card>
                              </div>
                            } 
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
