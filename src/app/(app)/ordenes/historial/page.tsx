"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailsDrawer } from "@/components/ordenes/order-details-drawer";
import { CotizacionDetailsDrawer } from "@/components/ordenes/cotizacion-details-drawer";
import { type Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Task01Icon, PlusSignIcon, FileEditIcon } from "hugeicons-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PresetCalendar from "@/components/p-calendar-21";
import { Calendar1 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { OrdenForm } from "@/components/ordenes/orden-form";
import { useSearchParams, useRouter } from "next/navigation";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WorkOrderDoc = Doc<"work_orders">;
type WorkOrderItem = NonNullable<WorkOrderDoc["items"]>[number];
type WorkOrderHistoryView = WorkOrderDoc & {
  clientName: string;
  clientData?: Record<string, unknown> | null;
  vehicleData?: { make?: string; model?: string; plate?: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-500/30",
  "En Progreso": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  "Listo": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/30",
  "Entregado": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
  "Completada": "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900 border-slate-800 dark:border-slate-200",
  "Cancelada": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  "Pendiente": "Recepción",
  "En Progreso": "En Reparación",
  "Listo": "Terminado",
  "Entregado": "Entregado",
  "Completada": "Completada",
  "Cancelada": "Anulada",
};

const HISTORY_STATUSES = new Set(["Completada", "Cancelada"]);

type TabKey = "historial" | "cotizaciones";

function HistorialOrdenesPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orders = useQuery(api.work_orders.get, orgId ? { orgId } : "skip") as WorkOrderHistoryView[] | undefined;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newCotizacionOpen, setNewCotizacionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("historial");

  const today = useMemo(() => new Date(), []);

  const applyFilters = useCallback((list: WorkOrderHistoryView[]) => {
    let result = [...list].sort((a, b) => b._creationTime - a._creationTime);

    if (dateRange?.from) {
      result = result.filter((o) => {
        const orderDate = new Date(o._creationTime);
        if (dateRange.from && orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setDate(toDate.getDate() + 1);
          if (orderDate >= toDate) return false;
        }
        return true;
      });
    }

    const term = debouncedSearch.trim().toLowerCase();
    if (term) {
      result = result.filter((o) => {
        const num = `${o.kind === "cotizacion" ? "COT" : "ORD"}-${o.number?.toString().padStart(4, "0")}`.toLowerCase();
        const client = (o.clientName ?? "").toLowerCase();
        const vehicle = o.vehicleData
          ? `${o.vehicleData.make ?? ""} ${o.vehicleData.model ?? ""}`.toLowerCase()
          : (o.vehicle ?? "").toLowerCase();
        return num.includes(term) || client.includes(term) || vehicle.includes(term);
      });
    }
    return result;
  }, [debouncedSearch, dateRange]);

  const sortedOrders = useMemo(() => {
    if (!orders) return undefined;
    const historial = orders.filter((o) => o.kind !== "cotizacion" && HISTORY_STATUSES.has(o.status));
    return applyFilters(historial);
  }, [orders, applyFilters]);

  const sortedCotizaciones = useMemo(() => {
    if (!orders) return undefined;
    const cots = orders.filter((o) => o.kind === "cotizacion");
    return applyFilters(cots);
  }, [orders, applyFilters]);

  const activeList = activeTab === "historial" ? sortedOrders : sortedCotizaciones;
  const { page, setPage, totalPages, paginatedItems: pagedOrders, total } = usePagination(activeList, 20);

  useEffect(() => {
    const param = searchParams.get("new");
    if (param === "1") {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/ordenes/historial", { scroll: false });
    } else if (param === "cotizacion") {
      queueMicrotask(() => setNewCotizacionOpen(true));
      router.replace("/ordenes/historial", { scroll: false });
    }
  }, [searchParams, router]);

  useNewShortcut(() => {
    if (activeTab === "cotizaciones") setNewCotizacionOpen(true);
    else setNewFormOpen(true);
  });

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Historial de Órdenes"
        mobileTitle="Historial"
        toolbar={
          <SearchFilterBar
            value={search}
            onValueChange={setSearch}
            placeholder={activeTab === "cotizaciones" ? "Buscar cotizaciones..." : "Buscar por orden, cliente o vehículo..."}
            onClear={() => setSearch("")}
          />
        }
      >
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="px-3">
                  <Calendar1 className="size-4" />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-2">
              <PresetCalendar
                selected={dateRange}
                onSelect={setDateRange}
                disabled={[{ after: today }]}
              />
            </PopoverContent>
          </Popover>

          {activeTab === "cotizaciones" ? (
            <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setNewCotizacionOpen(true)}>
              <FileEditIcon className="size-4" />
              <span className="hidden sm:inline">Nueva Cotización</span>
            </Button>
          ) : (
            <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setNewFormOpen(true)}>
              <PlusSignIcon className="size-4" />
              <span className="hidden sm:inline">Nueva Orden</span>
            </Button>
          )}
        </div>
        <OrdenForm open={newFormOpen} onOpenChange={setNewFormOpen} />
        <OrdenForm open={newCotizacionOpen} onOpenChange={setNewCotizacionOpen} kind="cotizacion" />
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="shrink-0 flex gap-0 border-b px-6 pt-4">
          {(["historial", "cotizaciones"] as TabKey[]).map((tab) => {
            const count = tab === "historial" ? sortedOrders?.length : sortedCotizaciones?.length;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={cn(
                  "relative flex items-center gap-2 px-4 pb-3 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "historial" ? "Historial" : "Cotizaciones"}
                {count !== undefined && count > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-md border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">{activeTab === "cotizaciones" ? "Cotización #" : "Orden #"}</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>{activeTab === "cotizaciones" ? "Estado" : "Estado"}</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeList === undefined ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center h-full">
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activeList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        {activeTab === "cotizaciones" ? (
                          <>
                            <FileEditIcon className="size-8 text-muted-foreground/50" />
                            <p>No hay cotizaciones.</p>
                            <Button variant="outline" size="sm" onClick={() => setNewCotizacionOpen(true)}>
                              Crear primera cotización
                            </Button>
                          </>
                        ) : (
                          <>
                            <Task01Icon className="size-8 text-muted-foreground/50" />
                            <p>No hay órdenes en el historial.</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (pagedOrders ?? []).map((order) => {
                    const rowTotal = (order.items ?? []).reduce((acc: number, item: WorkOrderItem) => acc + item.total, 0);
                    const isCot = order.kind === "cotizacion";
                    const prefix = isCot ? "COT" : "ORD";
                    const docNum = `${prefix}-${order.number?.toString().padStart(4, "0")}`;

                    const row = (
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{docNum}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order._creationTime), "d MMM, yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>{(order as WorkOrderHistoryView).clientName || "Sin cliente"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(order as WorkOrderHistoryView).vehicleData
                            ? `${(order as WorkOrderHistoryView).vehicleData?.make ?? ""} ${(order as WorkOrderHistoryView).vehicleData?.model ?? ""}`
                            : order.vehicle || "Sin vehículo"}
                        </TableCell>
                        <TableCell>
                          {isCot ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                              Cotización
                            </span>
                          ) : (
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${rowTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );

                    if (isCot) {
                      return (
                        <CotizacionDetailsDrawer
                          key={order._id}
                          order={order as WorkOrderHistoryView}
                          trigger={row}
                        />
                      );
                    }

                    return (
                      <OrderDetailsDrawer
                        key={order._id}
                        order={order}
                        trigger={row}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="border-t bg-background px-6 py-4 shrink-0">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
        </div>
      </main>
    </div>
  );
}

export default function HistorialOrdenesPageWrapper() {
  return (
    <Suspense>
      <HistorialOrdenesPage />
    </Suspense>
  );
}
