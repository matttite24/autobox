"use client";

import { VehicleDoc } from "./vehiculo-form";
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Car01Icon,
  UserCircleIcon,
  Task01Icon,
  Clock01Icon,
  Wrench01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  DollarCircleIcon,
  ArrowRight01Icon,
  ToolsIcon,
} from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyIcon, CheckIcon, ChevronDownIcon, Gauge } from "lucide-react";
import { useState } from "react";
import { ClientDoc } from "../clientes/cliente-form";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useOrg } from "@/components/providers/org-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const COLOR_HEX: Record<string, string> = {
  Blanco:   "#FFFFFF",
  Negro:    "#1a1a1a",
  Gris:     "#6b7280",
  Plata:    "#c0c0c0",
  Rojo:     "#dc2626",
  Azul:     "#2563eb",
  Verde:    "#16a34a",
  Amarillo: "#ca8a04",
  Naranja:  "#ea580c",
  Café:     "#78350f",
  Beige:    "#d4b483",
};

interface VehicleDetailsSheetProps {
  vehicle: VehicleDoc | null;
  client?: ClientDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HistoryOrder = {
  _id: string;
  number?: number;
  status: string;
  kind?: string;
  symptoms?: string;
  mileage?: number;
  workerName?: string | null;
  itemsTotal: number;
  paymentsTotal: number;
  partsCount: number;
  laborCount: number;
  isPaid: boolean;
  createdAt: number;
  updatedAt: number;
  items?: Array<{ id: string; type: string; description: string; quantity: number; unitPrice: number; total: number }>;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "error" | "outline"; dot: string }> = {
  "Pendiente":   { label: "Pendiente",   variant: "warning",   dot: "bg-amber-400" },
  "En Progreso": { label: "En Progreso", variant: "outline",   dot: "bg-blue-400" },
  "Listo":       { label: "Listo",       variant: "success",   dot: "bg-emerald-400" },
  "Entregado":   { label: "Entregado",   variant: "default",   dot: "bg-primary" },
  "Completada":  { label: "Completada",  variant: "secondary", dot: "bg-muted-foreground" },
  "Cancelada":   { label: "Cancelada",   variant: "error",     dot: "bg-red-400" },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "Completada" || status === "Entregado")
    return <CheckmarkCircle01Icon className="size-4 text-emerald-500 shrink-0" />;
  if (status === "Cancelada")
    return <Cancel01Icon className="size-4 text-red-500 shrink-0" />;
  if (status === "En Progreso")
    return <Wrench01Icon className="size-4 text-blue-500 shrink-0" />;
  if (status === "Listo")
    return <CheckmarkCircle01Icon className="size-4 text-emerald-400 shrink-0" />;
  return <Clock01Icon className="size-4 text-amber-500 shrink-0" />;
}

function OrderCard({ order, onNavigate }: { order: HistoryOrder; onNavigate: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, variant: "outline" as const, dot: "bg-muted-foreground" };
  const isCancelled = order.status === "Cancelada";
  const isCotizacion = order.kind === "cotizacion";

  return (
    <div className={cn(
      "rounded-xl border bg-card transition-all",
      isCancelled && "opacity-60",
    )}>
      {/* Header */}
      <button
        type="button"
        className="w-full text-left p-3 flex items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <StatusIcon status={order.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {isCotizacion ? "COT" : "ODT"}-{order.number?.toString().padStart(4, "0") ?? "S/N"}
            </span>
            <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
            {order.isPaid && (
              <Badge variant="success" size="sm">Pagado</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {order.symptoms || "Sin descripción de síntomas"}
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {format(order.createdAt, "d MMM yyyy", { locale: es })}
            </span>
            {order.mileage !== undefined && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Gauge className="size-3" />
                {order.mileage.toLocaleString()} km
              </span>
            )}
            {order.workerName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ToolsIcon className="size-3" />
                {order.workerName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {order.itemsTotal > 0 && (
            <span className="text-sm font-semibold tabular-nums">
              ${order.itemsTotal.toFixed(2)}
            </span>
          )}
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {/* Items breakdown */}
          {(order.items ?? []).length > 0 ? (
            <div className="space-y-1.5">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
                      item.type === "part"    && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                      item.type === "labor"   && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                      item.type === "service" && "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                    )}>
                      {item.type === "part" ? "Repuesto" : item.type === "labor" ? "Mano de obra" : "Servicio"}
                    </span>
                    <span className="truncate text-foreground">{item.description}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-muted-foreground ml-2">
                    {item.quantity > 1 && <span className="mr-1">{item.quantity}×</span>}
                    ${item.total.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Total line */}
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <span className="text-xs font-medium">Total</span>
                <span className="text-sm font-bold tabular-nums">${order.itemsTotal.toFixed(2)}</span>
              </div>
              {order.paymentsTotal < order.itemsTotal && order.itemsTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-destructive">
                  <span>Saldo pendiente</span>
                  <span className="font-semibold tabular-nums">
                    ${(order.itemsTotal - order.paymentsTotal).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sin ítems registrados</p>
          )}

          {/* Navigate button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 h-7 text-xs"
            onClick={() => onNavigate(order._id)}
          >
            Ver orden completa
            <ArrowRight01Icon className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function VehicleDetailsSheet({ vehicle, client, open, onOpenChange }: VehicleDetailsSheetProps) {
  const { orgId } = useOrg();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  const history = useQuery(
    api.vehicles.getHistoryByVehicle,
    vehicle && orgId ? { orgId, vehicleId: vehicle._id } : "skip"
  ) as HistoryOrder[] | undefined;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleNavigate = (orderId: string) => {
    onOpenChange(false);
    router.push(`/ordenes?orderId=${orderId}`);
  };

  // Stats calculados
  const completedOrders = history?.filter(
    (o) => o.status === "Completada" || o.status === "Entregado"
  ) ?? [];
  const totalSpent = completedOrders.reduce((s, o) => s + o.itemsTotal, 0);
  const activeOrders = history?.filter(
    (o) => o.status === "En Progreso" || o.status === "Listo" || o.status === "Pendiente"
  ) ?? [];

  return (
    <Drawer position="right" open={open} onOpenChange={onOpenChange}>
      <DrawerPopup variant="inset" className="max-w-lg w-full h-full flex flex-col bg-background rounded-l-2xl border-l">
        {vehicle && (
          <>
            {/* Header */}
            <DrawerHeader className="shrink-0 pt-6 pb-4 px-5 text-left border-b">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Car01Icon className="size-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <DrawerTitle className="text-xl leading-tight">
                    {vehicle.make} {vehicle.model}
                    {vehicle.year && <span className="text-muted-foreground font-normal"> · {vehicle.year}</span>}
                  </DrawerTitle>
                  <DrawerDescription className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono bg-muted/60 px-2 py-0.5 rounded border text-xs uppercase tracking-widest">
                      {vehicle.plate}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(vehicle.plate, "plate")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === "plate"
                        ? <CheckIcon className="size-3.5 text-green-500" />
                        : <CopyIcon className="size-3.5" />}
                    </button>
                    {vehicle.color && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border/60 shrink-0"
                          style={{ backgroundColor: COLOR_HEX[vehicle.color] ?? "currentColor" }}
                        />
                        {vehicle.color}
                      </span>
                    )}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-6">

              {/* Propietario */}
              {client && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircleIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{client.name}</p>
                    {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                    {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                  </div>
                </div>
              )}

              {/* Título + Stats + KM */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Task01Icon className="size-4" />
                  Historial del vehículo
                </h3>

                {history !== undefined && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border text-center">
                      <span className="text-2xl font-bold tabular-nums">{history.length}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Visitas</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border text-center">
                      <span className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {activeOrders.length > 0 ? activeOrders.length : completedOrders.length}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {activeOrders.length > 0 ? "Activas" : "Completadas"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border text-center">
                      <span className="text-xl font-bold tabular-nums">${totalSpent.toFixed(0)}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">Invertido</span>
                    </div>
                  </div>
                )}

                {vehicle.mileage !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border">
                    <div className="flex items-center gap-2">
                      <Gauge className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Kilometraje actual</p>
                        <p className="text-sm font-semibold tabular-nums">{vehicle.mileage.toLocaleString()} km</p>
                      </div>
                    </div>
                    {vehicle.nextMileage !== undefined && (
                      <div className="text-right">
                        <p className="text-xs text-amber-600 dark:text-amber-400">Próximo cambio</p>
                        <p className="text-sm font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                          {vehicle.nextMileage.toLocaleString()} km
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Órdenes */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Órdenes de trabajo
                </h3>

                {history === undefined ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/20 text-center">
                    <Car01Icon className="size-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Sin historial todavía</p>
                    <p className="text-xs text-muted-foreground mt-1">Las órdenes de trabajo aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Línea vertical del timeline */}
                    <div className="absolute left-[18px] top-5 bottom-5 w-px bg-border" />

                    <div className="space-y-3">
                      {history.map((order) => (
                        <div key={order._id} className="flex gap-3">
                          {/* Dot del timeline */}
                          <div className="mt-4 shrink-0">
                            <div className={cn(
                              "h-3 w-3 rounded-full border-2 border-background ring-2",
                              order.status === "Completada" || order.status === "Entregado"
                                ? "bg-emerald-400 ring-emerald-200 dark:ring-emerald-900"
                                : order.status === "Cancelada"
                                ? "bg-red-400 ring-red-200 dark:ring-red-900"
                                : order.status === "En Progreso"
                                ? "bg-blue-400 ring-blue-200 dark:ring-blue-900"
                                : order.status === "Listo"
                                ? "bg-emerald-300 ring-emerald-100 dark:ring-emerald-950"
                                : "bg-amber-400 ring-amber-200 dark:ring-amber-900"
                            )} />
                          </div>

                          {/* Card */}
                          <div className="flex-1 min-w-0">
                            <OrderCard order={order} onNavigate={handleNavigate} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </DrawerPopup>
    </Drawer>
  );
}
