"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/components/providers/org-provider";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { ServiceForm } from "@/components/servicios/service-form";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import {
  Briefcase01Icon,
  PlusSignIcon,
  Search01Icon,
} from "hugeicons-react";

export default function ServiciosPage() {
  const { orgId } = useOrg();
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const [search, setSearch] = useState("");
  const [newFormOpen, setNewFormOpen] = useState(false);

  useNewShortcut(() => setNewFormOpen(true));

  const services = useQuery(
    api.services.get,
    orgId
      ? {
          orgId,
          searchTerm: search.trim() || undefined,
        }
      : "skip",
  );

  const currency = settings?.currency ?? "USD";
  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency],
  );

  const { page, setPage, totalPages, paginatedItems: pagedServices, total } = usePagination(services, 20);

  if (!orgId) return null;

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Servicios"
        mobileTitle="Servicios"
        toolbar={
          <div className="relative w-full max-w-md min-w-0 mx-auto">
            <Search01Icon className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar servicio..."
              className="pl-9"
            />
          </div>
        }
      >
        <Button size="sm" className="shrink-0" onClick={() => setNewFormOpen(true)} aria-label="Nuevo servicio">
          <PlusSignIcon className="size-4" />
          <span className="hidden sm:inline">Nuevo Servicio</span>
        </Button>
        <ServiceForm open={newFormOpen} onOpenChange={setNewFormOpen} currency={currency} />
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services === undefined ? (
            Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="border rounded-xl p-4 bg-card min-h-[150px] flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-12 rounded-xl" />
                </div>
                <div className="mt-3 flex justify-end">
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))
          ) : pagedServices && pagedServices.length > 0 ? (
            pagedServices.map((service) => {
              const billingLabel = service.billingType === "unit" ? "Por unidad" : "Por hora";
              const isActive = service.status === "Activo";

              return (
                <div
                  key={service._id}
                  className={`border rounded-xl p-4 bg-card transition-all hover:border-primary/50 hover:shadow-sm flex flex-col min-h-[150px] ${
                    !isActive ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg ${isActive ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"}`}>
                        <Briefcase01Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold">{service.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {service.status}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-md bg-muted/60 px-2 py-0.5">{billingLabel}</span>
                          <span className="truncate">{service.description || "Sin descripción"}</span>
                        </div>
                      </div>
                    </div>
                    <ServiceForm
                      service={service}
                      currency={currency}
                      trigger={
                        <Button variant="outline" size="sm" className="rounded-full h-8 shrink-0">
                          Editar
                        </Button>
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Venta</div>
                      <p className="mt-1 text-sm font-semibold leading-none">{money.format(service.salePrice)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Costo</div>
                      <p className="mt-1 text-sm font-semibold leading-none">{money.format(service.costPrice)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed bg-muted/20 py-16 text-center text-muted-foreground">
              <Briefcase01Icon className="mx-auto mb-3 size-12 opacity-20" />
              <p>No se encontraron servicios.</p>
            </div>
          )}
          </div>
        </div>
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
        </div>
      </main>
    </div>
  );
}
