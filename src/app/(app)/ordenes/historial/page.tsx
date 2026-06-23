"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailsDrawer } from "@/components/ordenes/order-details-drawer";
import { type Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Task01Icon, PlusSignIcon } from "hugeicons-react";
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
type WorkOrderVehicleData = {
  make?: string;
  model?: string;
  plate?: string;
};
type WorkOrderHistoryView = WorkOrderDoc & {
  clientName: string;
  clientData?: Record<string, unknown> | null;
  vehicleData?: WorkOrderVehicleData | null;
};

const STATUS_COLORS: Record<string, string> = {
  "Pendiente": "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-500/30",
  "En Progreso": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  "Listo": "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/30",
  "Entregado": "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
  "Completada": "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-900 border-slate-800 dark:border-slate-200",
  "Cancelada": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-500/30"
};

const STATUS_LABELS: Record<string, string> = {
  "Pendiente": "Recepción",
  "En Progreso": "En Reparación",
  "Listo": "Terminado",
  "Entregado": "Entregado",
  "Completada": "Completada",
  "Cancelada": "Anulada"
};

export default function HistorialOrdenesPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orders = useQuery(api.work_orders.get, orgId ? { orgId } : "skip") as WorkOrderHistoryView[] | undefined;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const HISTORY_STATUSES = new Set(["Completada", "Cancelada"]);

  const sortedOrders = useMemo(() => {
    if (!orders) return undefined;

    let result = [...orders]
      .filter((o) => HISTORY_STATUSES.has(o.status))
      .sort((a, b) => b._creationTime - a._creationTime);

    if (dateRange?.from) {
      result = result.filter(o => {
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
        const num = `ORD-${o.number?.toString().padStart(4, "0")}`.toLowerCase();
        const view = o as WorkOrderHistoryView;
        const client = (view.clientName ?? "").toLowerCase();
        const vehicle = view.vehicleData
          ? `${view.vehicleData.make ?? ""} ${view.vehicleData.model ?? ""}`.toLowerCase()
          : (o.vehicle ?? "").toLowerCase();
        return num.includes(term) || client.includes(term) || vehicle.includes(term);
      });
    }
    
    return result;
  }, [orders, debouncedSearch, dateRange]);

  const { page, setPage, totalPages, paginatedItems: pagedOrders, total } = usePagination(sortedOrders, 20);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    queueMicrotask(() => setNewFormOpen(true));
    router.replace("/ordenes/historial", { scroll: false });
  }, [searchParams, router]);

  useNewShortcut(() => setNewFormOpen(true));

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Historial de Órdenes"
        mobileTitle="Historial"
        toolbar={
          <SearchFilterBar
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por orden, cliente o vehículo..."
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
                disabled={[{ after: new Date() }]}
              />
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => setNewFormOpen(true)}
            aria-label="Nueva orden"
          >
            <PlusSignIcon className="size-4" />
            <span className="hidden sm:inline">Nueva Orden</span>
          </Button>
        </div>
        <OrdenForm open={newFormOpen} onOpenChange={setNewFormOpen} />
      </AppHeader>
      
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-md border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Orden #</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders === undefined ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex justify-center items-center h-full">
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <Task01Icon className="size-8 text-muted-foreground/50" />
                      <p>No hay órdenes en el historial.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (pagedOrders ?? []).map((order) => {
                  const total = (order.items || []).reduce((acc: number, item: WorkOrderItem) => acc + item.total, 0);
                  
                  return (
                    <OrderDetailsDrawer 
                      key={order._id}
                      order={order}
                      trigger={
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">
                            ORD-{order.number?.toString().padStart(4, '0')}
                          </TableCell>
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
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status] || order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      }
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
