"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "@convex/_generated/dataModel";
import { PurchaseForm } from "@/components/compras/purchase-form";
import { PurchaseDetailsDrawer } from "@/components/compras/purchase-details-drawer";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PresetCalendar from "@/components/p-calendar-21";
import { Calendar1 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart01Icon,
  Invoice01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Alert01Icon,
  PlusSignIcon,
  MoneyBag01Icon,
  Clock01Icon
} from "hugeicons-react";

export default function ComprasPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const purchases = useQuery(api.purchases.get, orgId ? { orgId } : "skip");
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<Id<"purchases"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(() => searchParams.get("new") === "1");
  const [today] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"todas" | "pendientes" | "vencidas">("todas");

  useEffect(() => {
    const purchaseId = searchParams.get("purchaseId");
    const isNew = searchParams.get("new") === "1";

    if (isNew) {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/compras", { scroll: false });
      return;
    }

    if (purchaseId) {
      if (!purchases) return; // esperar a que carguen antes de limpiar la URL
      const target = purchases.find((p) => p._id === purchaseId);
      router.replace("/compras", { scroll: false });
      if (target) {
        const timer = window.setTimeout(() => {
          setSelectedPurchaseId(target._id);
          setIsDetailsOpen(true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [searchParams, purchases, router]);

  useNewShortcut(() => setNewFormOpen(true));

  const selectedPurchase = purchases?.find(p => p._id === selectedPurchaseId) || null;

  const metrics = useMemo(() => {
    if (!purchases) return { totalDeuda: 0, vencida: 0, porVencer: 0, closestDueDate: null as number | null };
    
    let totalDeuda = 0;
    let vencida = 0;
    let porVencer = 0;
    let closestDueDate: number | null = null;
    
    const settingsTaxRate = settings?.taxRate ?? 15;
    const sevenDaysFromNow = today + 7 * 24 * 60 * 60 * 1000;

    purchases.forEach(p => {
      if (p.status === "Cancelada" || p.paymentStatus === "Pagado" || !p.dueDate) return;
      
      const subtotal = p.items?.reduce((acc, item) => acc + item.total, 0) || 0;
      const iva = subtotal * (settingsTaxRate / 100);
      const total = subtotal + iva;
      const pagado = p.payments?.reduce((acc, pay) => acc + pay.amount, 0) || 0;
      const deuda = total - pagado;
      
      totalDeuda += deuda;
      
      if (p.dueDate < today) {
        vencida += deuda;
      } else {
        if (p.dueDate <= sevenDaysFromNow) {
          porVencer += deuda;
        }
        if (closestDueDate === null || p.dueDate < closestDueDate) {
          closestDueDate = p.dueDate;
        }
      }
    });
    
    return { totalDeuda, vencida, porVencer, closestDueDate };
  }, [purchases, today, settings?.taxRate]);

  const filteredPurchases = useMemo(() => {
    if (!purchases) return undefined;

    let result = purchases;

    if (dateRange?.from) {
      result = result.filter(p => {
        const purchaseDate = new Date(p._creationTime);
        if (dateRange.from && purchaseDate < dateRange.from) return false;
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setDate(toDate.getDate() + 1);
          if (purchaseDate >= toDate) return false;
        }
        return true;
      });
    }

    const term = debouncedSearch.trim().toLowerCase();
    if (term) {
      result = result.filter((p) => {
        const num = (p.number ?? "").toString().toLowerCase();
        const supplier = (p.supplierName ?? "").toLowerCase();
        return num.includes(term) || supplier.includes(term);
      });
    }

    if (activeTab === "pendientes") {
      result = result.filter(p => p.dueDate && p.paymentStatus !== "Pagado" && p.status !== "Cancelada" && p.dueDate >= today);
    } else if (activeTab === "vencidas") {
      result = result.filter(p => p.dueDate && p.dueDate < today && p.paymentStatus !== "Pagado" && p.status !== "Cancelada");
    }

    // sort by created descending
    result.sort((a, b) => b._creationTime - a._creationTime);

    return result;
  }, [purchases, debouncedSearch, dateRange, activeTab, today]);

  const { page, setPage, totalPages, paginatedItems: pagedPurchases, total } = usePagination(filteredPurchases, 20);

  if (!orgId) return null;

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Compras"
        mobileTitle="Compras"
        toolbar={
          <SearchFilterBar
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por factura o proveedor..."
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
            aria-label="Nueva compra"
          >
            <PlusSignIcon className="size-4" />
            <span className="hidden sm:inline">Nueva Compra</span>
          </Button>
        </div>
        <PurchaseForm
          open={newFormOpen}
          onOpenChange={setNewFormOpen}
          onPurchaseCreated={(purchaseId) => {
            setSelectedPurchaseId(purchaseId);
            setIsDetailsOpen(true);
          }}
        />
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted/10">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="w-full space-y-6">
            
            {/* Dashboard KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-sm font-medium">Deuda Total a Crédito</span>
                  <MoneyBag01Icon className="size-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">${metrics.totalDeuda.toFixed(2)}</p>
              </div>
              <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-sm font-medium">Próxima a Vencer (7 días)</span>
                  <Clock01Icon className="size-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">${metrics.porVencer.toFixed(2)}</p>
              </div>
              <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-sm font-medium">Próximo Pago</span>
                  <Calendar1 className="size-5 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold">
                  {metrics.closestDueDate
                    ? `En ${Math.max(1, Math.ceil((metrics.closestDueDate - today) / (1000 * 60 * 60 * 24)))} días`
                    : "No hay pagos"}
                </p>
              </div>
              <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
                  <span className="text-sm font-medium">Deuda Vencida</span>
                  <Alert01Icon className="size-5" />
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">${metrics.vencida.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setPage(1); }} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                  <TabsTrigger value="todas">Todas</TabsTrigger>
                  <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                  <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPurchases === undefined ? (
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
            ) : pagedPurchases && pagedPurchases.length > 0 ? (
              pagedPurchases.map((purchase) => {
                const items = purchase.items || [];
                const subtotal = items.reduce((acc, item) => acc + item.total, 0);
                const taxRate = settings?.taxRate ?? 15;
                const iva = subtotal * (taxRate / 100);
                const total = subtotal + iva;

                const isReceived = purchase.status === "Recibida";
                const isDraft = purchase.status === "Borrador";
                const isCanceled = purchase.status === "Cancelada";

                const isOverdue = purchase.dueDate && purchase.dueDate < today && purchase.paymentStatus !== "Pagado";
                
                let daysLeftText = "";
                if (purchase.dueDate && purchase.paymentStatus !== "Pagado" && !isCanceled) {
                  const diffTime = purchase.dueDate - today;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) {
                    daysLeftText = `Vence en ${diffDays} día${diffDays === 1 ? '' : 's'}`;
                  } else if (diffDays < 0) {
                    daysLeftText = `Venció hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;
                  } else {
                    daysLeftText = "Vence hoy";
                  }
                }

                return (
                  <div
                    key={purchase._id}
                    onClick={() => {
                      setSelectedPurchaseId(purchase._id);
                      setIsDetailsOpen(true);
                    }}
                    className={`border rounded-xl p-4 bg-card cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm flex flex-col relative overflow-hidden ${isCanceled ? 'opacity-70' : ''
                      }`}
                  >
                    {isOverdue && !isCanceled && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isReceived ? 'bg-emerald-100 text-emerald-600' :
                            isCanceled ? 'bg-red-100 text-red-600' :
                              'bg-blue-100 text-blue-600'
                          }`}>
                          {isReceived ? <CheckmarkCircle01Icon className="size-4" /> :
                            isCanceled ? <Cancel01Icon className="size-4" /> :
                              <Invoice01Icon className="size-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Fac {purchase.number || 'S/N'}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={purchase.supplierName}>{purchase.supplierName}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isDraft ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            purchase.paymentStatus === "Pagado" ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              purchase.paymentStatus === "Parcial" ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {isDraft ? "Borrador" : purchase.paymentStatus}
                        </span>
                        {daysLeftText && !isDraft && (
                          <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                            {daysLeftText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex justify-between items-end border-t pt-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShoppingCart01Icon className="size-3" />
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
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-xl bg-card">
                <ShoppingCart01Icon className="size-12 mb-3 opacity-20" />
                <p>No se encontraron compras en esta vista</p>
              </div>
            )}
            </div>
          </div>
        </div>
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
        </div>
      </main>

      <PurchaseDetailsDrawer
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) {
            setTimeout(() => setSelectedPurchaseId(null), 300); // clear after animation
          }
        }}
        purchase={selectedPurchase}
      />
    </div>
  );
}
