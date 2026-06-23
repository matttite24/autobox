"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { VehiculoForm, type VehicleDoc } from "@/components/vehiculos/vehiculo-form";
import { VehicleDetailsSheet } from "@/components/vehiculos/vehicle-details-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { usePagination } from "@/hooks/use-pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { PaginationBar } from "@/components/pagination-bar";
import { PlusSignIcon, PencilEdit01Icon, Delete01Icon, Car01Icon } from "hugeicons-react";
import { toastManager } from "@/components/ui/toast";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Id } from "@convex/_generated/dataModel";
export default function VehiculosPage() {
  const { orgId } = useOrg();
  const vehicles = useQuery(api.vehicles.get, orgId ? { orgId } : "skip") as VehicleDoc[] | undefined;
  const removeVehicle = useMutation(api.vehicles.remove);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [vinFilter, setVinFilter] = useState<"Todos" | "Con VIN" | "Sin VIN">("Todos");
  const searchParams = useSearchParams();
  const router = useRouter();
  const vehicleId = searchParams.get("vehicleId");
  const isNew = searchParams.get("new") === "1";
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDoc | null>(null);
  const [newFormOpen, setNewFormOpen] = useState(() => isNew);

  const selectedVehicleFromQuery = (vehicles as VehicleDoc[] | undefined)?.find((v) => v._id === vehicleId) ?? null;
  const activeVehicle = selectedVehicle ?? selectedVehicleFromQuery;

  useEffect(() => {
    if (isNew) {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/vehiculos", { scroll: false });
      return;
    }
    if (vehicleId) {
      if (!vehicles) return; // wait for vehicles to load before clearing URL
      router.replace("/vehiculos", { scroll: false });
    }
  }, [vehicleId, isNew, vehicles, router]);

  useNewShortcut(() => setNewFormOpen(true));

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return vehicles;
    const term = debouncedSearchTerm.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesVinFilter =
        vinFilter === "Todos" ||
        (vinFilter === "Con VIN" ? !!vehicle.vin : !vehicle.vin);
      if (!matchesVinFilter) return false;
      if (!term) return true;

      const searchable = [
        vehicle.make,
        vehicle.model,
        vehicle.plate,
        vehicle.clientName,
        vehicle.color,
        vehicle.vin,
        vehicle.year ? String(vehicle.year) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [vehicles, debouncedSearchTerm, vinFilter]);
  const { page, setPage, totalPages, paginatedItems: pagedVehicles, total } = usePagination(filteredVehicles, 20);

  const handleDelete = async (id: Id<"vehicles">) => {
    if (!confirm("¿Seguro que deseas eliminar este vehículo?")) return;
    
    try {
      await removeVehicle({ id });
      toastManager.add({ title: "Vehículo eliminado", description: "Se ha eliminado el vehículo exitosamente." });
    } catch (error) {
      toastManager.add({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el vehículo.",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
        <AppHeader
        title="Vehículos"
        mobileTitle="Vehículos"
        toolbar={
          <SearchFilterBar
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar por placa, marca, modelo, cliente o VIN"
            isActive={!!searchTerm.trim() || vinFilter !== "Todos"}
            onClear={() => {
              setSearchTerm("");
              setVinFilter("Todos");
            }}
            selectedOption={vinFilter === "Todos" ? "" : vinFilter}
            onSelectOption={(value) => setVinFilter((value as typeof vinFilter) || "Todos")}
            options={[
              { value: "Con VIN", label: "Con VIN" },
              { value: "Sin VIN", label: "Sin VIN" },
            ]}
          />
        }
      >
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setNewFormOpen(true)}
          aria-label="Nuevo vehículo"
        >
          <PlusSignIcon className="size-4" />
          <span className="hidden sm:inline">Nuevo Vehículo</span>
        </Button>
        <VehiculoForm open={newFormOpen} onOpenChange={setNewFormOpen} />
      </AppHeader>
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-md border bg-card overflow-auto">
            <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehículo</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Cliente Propietario</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>VIN</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles === undefined ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                </TableRow>
              ))
            ) : filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Car01Icon className="size-8 text-muted-foreground/50" />
                    <p>No hay vehículos registrados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              (pagedVehicles ?? []).map((v) => (
                <TableRow 
                  key={v._id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedVehicle(v)}
                >
                  <TableCell className="font-medium">
                    {v.make} {v.model} {v.year ? `· ${v.year}` : ""}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono uppercase tracking-widest text-xs border rounded bg-muted px-2 py-0.5">
                      {v.plate}
                    </span>
                  </TableCell>
                  <TableCell>{v.clientName}</TableCell>
                  <TableCell>
                    {v.color ? (
                      <span className="text-muted-foreground">{v.color}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {v.vin ? (
                      <span className="font-mono text-xs">{v.vin}</span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <VehiculoForm
                        vehicle={v}
                        trigger={
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                            <PencilEdit01Icon className="h-4 w-4" />
                          </Button>
                        } 
                      />
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(v._id)}
                      >
                        <Delete01Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

      <VehicleDetailsSheet 
        vehicle={activeVehicle}
        client={activeVehicle?.clientData as any}
        open={!!activeVehicle}
        onOpenChange={(val) => {
          if (!val) setSelectedVehicle(null);
        }}
      />
    </>
  );
}
