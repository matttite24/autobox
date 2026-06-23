"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "@convex/_generated/dataModel";
import { SaleForm } from "@/components/ventas/sale-form";
import { SaleDetailsDrawer } from "@/components/ventas/sale-details-drawer";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PresetCalendar from "@/components/p-calendar-21";
import { Calendar1 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ShoppingBag01Icon,
  Invoice01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  PlusSignIcon
} from "hugeicons-react";

export default function VentasPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sales = useQuery(api.sales.get, orgId ? { orgId } : "skip");
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const taxRate = settings?.taxRate ?? 15;
  const [selectedSaleId, setSelectedSaleId] = useState<Id<"sales"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(() => searchParams.get("new") === "1");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const filteredSales = useMemo(() => {
    if (!sales) return undefined;

    let result = sales;

    if (dateRange?.from) {
      result = result.filter(s => {
        const saleDate = new Date(s._creationTime);
        if (dateRange.from && saleDate < dateRange.from) return false;
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setDate(toDate.getDate() + 1);
          if (saleDate >= toDate) return false;
        }
        return true;
      });
    }

    const term = debouncedSearch.trim().toLowerCase();
    if (term) {
      result = result.filter((s) => {
        const num = (s.number ?? "").toString().toLowerCase();
        const client = (s.clientName ?? "").toLowerCase();
        return num.includes(term) || client.includes(term);
      });
    }

    return result;
  }, [sales, debouncedSearch, dateRange]);

  useEffect(() => {
    const saleId = searchParams.get("saleId");
    const isNew = searchParams.get("new") === "1";

    if (saleId && sales) {
      const target = sales.find((s) => s._id === saleId);
      if (target) {
        const timer = window.setTimeout(() => {
          setSelectedSaleId(target._id);
          setIsDetailsOpen(true);
        }, 0);
        router.replace("/ventas", { scroll: false });
        return () => window.clearTimeout(timer);
      }
    }

    if (isNew) {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/ventas", { scroll: false });
      return;
    }

    if (saleId) {
      if (!sales) return; // wait for sales to load before clearing URL
      router.replace("/ventas", { scroll: false });
    }
  }, [searchParams, sales, router]);

  useNewShortcut(() => setNewFormOpen(true));

  const selectedSale = sales?.find(s => s._id === selectedSaleId) || null;
  const { page, setPage, totalPages, paginatedItems: pagedSales, total } = usePagination(filteredSales, 20);

  if (!orgId) return null;

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Ventas"
        mobileTitle="Ventas"
        toolbar={
          <SearchFilterBar
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por número o cliente..."
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
            aria-label="Nueva venta"
          >
            <PlusSignIcon className="size-4" />
            <span className="hidden sm:inline">Nueva Venta</span>
          </Button>
        </div>
        <SaleForm
          open={newFormOpen}
          onOpenChange={setNewFormOpen}
          onSaleCreated={(saleId) => {
            setSelectedSaleId(saleId);
            setIsDetailsOpen(true);
          }}
        />
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSales === undefined ? (
            Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-4 bg-card h-32 flex flex-col justify-between">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
                <div className="flex justify-between mt-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))
          ) : pagedSales && pagedSales.length > 0 ? (
            pagedSales.map((sale) => {
              const items = sale.items || [];
              const subtotal = items.reduce((acc, item) => acc + item.total, 0);
              const total = subtotal * (1 + taxRate / 100);

              const isCompleted = sale.status === "Completada";
              const isCanceled = sale.status === "Cancelada";

              return (
                <div
                  key={sale._id}
                  onClick={() => {
                    setSelectedSaleId(sale._id);
                    setIsDetailsOpen(true);
                  }}
                  className={`border rounded-xl p-4 bg-card cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm flex flex-col ${isCanceled ? 'opacity-70' : ''
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-100 text-emerald-600' :
                          isCanceled ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {isCompleted ? <CheckmarkCircle01Icon className="size-4" /> :
                          isCanceled ? <Cancel01Icon className="size-4" /> :
                            <Invoice01Icon className="size-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Venta #{sale.number}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{sale.clientName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        isCanceled ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                      {sale.status}
                    </span>
                  </div>

                  <div className="mt-auto flex justify-between items-end border-t pt-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShoppingBag01Icon className="size-3" />
                      {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg leading-none">${total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl">
              <ShoppingBag01Icon className="size-12 mb-3 opacity-20" />
              <p>No se encontraron ventas</p>
            </div>
          )}
          </div>
        </div>
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
        </div>
      </main>

      <SaleDetailsDrawer
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setTimeout(() => setSelectedSaleId(null), 300); // clear after animation
          }
        }}
        sale={selectedSale}
      />
    </div>
  );
}
