"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { useOrg } from "@/components/providers/org-provider";
import { Car01Icon } from "hugeicons-react";

export type VehicleDoc = {
  _id: Id<"vehicles">;
  _creationTime: number;
  clientId: Id<"clients">;
  plate: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  mileage?: number;
  nextMileage?: number;
  notes?: string;
  clientName?: string;
  clientData?: Record<string, unknown> | null;
};

interface VehiculoFormProps {
  vehicle?: VehicleDoc;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const COMMON_COLORS = [
  { label: "Blanco",   hex: "#FFFFFF", border: true },
  { label: "Negro",    hex: "#1a1a1a" },
  { label: "Gris",     hex: "#6b7280" },
  { label: "Plata",    hex: "#c0c0c0", border: true },
  { label: "Rojo",     hex: "#dc2626" },
  { label: "Azul",     hex: "#2563eb" },
  { label: "Verde",    hex: "#16a34a" },
  { label: "Amarillo", hex: "#ca8a04" },
  { label: "Naranja",  hex: "#ea580c" },
  { label: "Café",     hex: "#78350f" },
  { label: "Beige",    hex: "#d4b483", border: true },
];

export function VehiculoForm({ vehicle, trigger, open: openProp, onOpenChange }: VehiculoFormProps) {
  const { orgId } = useOrg();
  const createVehicle = useMutation(api.vehicles.create);
  const updateVehicle = useMutation(api.vehicles.update);
  const createClient = useMutation(api.clients.create);
  const clients = useQuery(api.clients.get, orgId ? { orgId } : "skip");

  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clientId, setClientId] = useState<Id<"clients"> | "">("");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");

  // Client search state
  const [clientSearch, setClientSearch] = useState("");
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", email: "", phone: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize form when opening for editing
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        if (vehicle) {
          setClientId(vehicle.clientId);
          setPlate(vehicle.plate);
          setMake(vehicle.make);
          setModel(vehicle.model);
          setYear(vehicle.year?.toString() || "");
          setColor(vehicle.color || "");
          setVin(vehicle.vin || "");
          setMileage(vehicle.mileage?.toString() || "");
        } else {
          setClientId("");
          setPlate("");
          setMake("");
          setModel("");
          setYear("");
          setColor("");
          setVin("");
          setMileage("");
        }
        setClientSearch("");
        setShowNewClientForm(false);
      });
    }
  }, [open, vehicle]);

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, filtered: typeof clients) => {
      const list = filtered ?? [];
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeIdx + 1, list.length - 1);
        setActiveIdx(next);
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeIdx - 1, 0);
        setActiveIdx(prev);
        itemRefs.current[prev]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIdx >= 0 && list[activeIdx]) {
          setClientId(list[activeIdx]!._id);
          setClientSearch("");
          setActiveIdx(-1);
        } else if (list.length === 1) {
          setClientId(list[0]!._id);
          setClientSearch("");
          setActiveIdx(-1);
        } else if (list.length === 0 && clientSearch) {
          setNewClientData((d) => ({ ...d, name: clientSearch }));
          setShowNewClientForm(true);
          setClientSearch("");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (clientSearch) {
          setClientSearch("");
          setActiveIdx(-1);
        }
      }
    },
    [activeIdx, clientSearch]
  );

  useEffect(() => {
    queueMicrotask(() => setActiveIdx(-1));
  }, [clientSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !make || !model || !plate) return;
    setSubmitting(true);
    
    const payload = {
      clientId: clientId as Id<"clients">,
      make,
      model,
      plate: plate.toUpperCase(),
      year: year ? parseInt(year) : undefined,
      color: color || undefined,
      vin: vin ? vin.toUpperCase() : undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
    };

    try {
      if (vehicle) {
        await updateVehicle({ id: vehicle._id, ...payload });
        toastManager.add({ type: "success", title: "Vehículo actualizado", description: "Los cambios han sido guardados." });
      } else {
        if (!orgId) throw new Error("Org ID required");
        await createVehicle({ ...payload, orgId });
        toastManager.add({ type: "success", title: "Vehículo creado", description: "El vehículo ha sido registrado exitosamente." });
      }
      setOpen(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "Hubo un problema al guardar el vehículo." });
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = !!vehicle;
  const isFormValid = clientId && make && model && plate;

  const formContent = (
    <form id="vehiculo-form" onSubmit={handleSubmit} className="space-y-6 px-4 pb-4 overflow-y-auto">
      {/* Buscador / Selector de Cliente */}
      <div className="space-y-2">
        <Label>Propietario / Cliente</Label>
        
        {!clientId ? (
          <>
            <div className="relative">
              <Input
                ref={searchRef}
                placeholder="Buscar cliente por nombre..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowNewClientForm(false);
                }}
                onKeyDown={(e) => {
                  const filtered = (clients ?? []).filter((c) =>
                    c.name.toLowerCase().includes(clientSearch.toLowerCase())
                  );
                  handleSearchKey(e, filtered);
                }}
              />
            </div>

            {!showNewClientForm && (() => {
              const filtered = (clients ?? []).filter((c) =>
                c.name.toLowerCase().includes(clientSearch.toLowerCase())
              );
              return (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1" role="listbox">
                  {clientSearch && filtered.map((c, i) => (
                    <button
                      key={c._id}
                      ref={(el) => { itemRefs.current[i] = el; }}
                      type="button"
                      role="option"
                      aria-selected={activeIdx === i}
                      onClick={() => {
                        setClientId(c._id);
                        setClientSearch("");
                        setActiveIdx(-1);
                      }}
                      className={[
                        "w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all",
                        activeIdx === i
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                      {activeIdx === i && (
                        <kbd className="text-[10px] bg-muted border rounded px-1.5 py-0.5 text-muted-foreground">Enter</kbd>
                      )}
                    </button>
                  ))}
                  
                  {clientSearch && filtered.length === 0 && (
                    <div className="text-center py-4 space-y-2">
                      <p className="text-sm text-muted-foreground">No se encontró &ldquo;{clientSearch}&rdquo;</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewClientData((d) => ({ ...d, name: clientSearch }));
                          setShowNewClientForm(true);
                          setClientSearch("");
                        }}
                      >
                        + Crear cliente
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {showNewClientForm && (
              <div className="space-y-3 border rounded-xl p-4 bg-muted/30">
                <p className="text-sm font-semibold">Nuevo cliente</p>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    autoFocus
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono (opcional)</Label>
                  <Input
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewClientForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={creatingClient || !newClientData.name || !newClientData.email}
                    onClick={async () => {
                      setCreatingClient(true);
                      try {
                        if (!orgId) throw new Error("Org ID required");
                        const id = await createClient({
                          orgId,
                          roles: ["Cliente"],
                          name: newClientData.name,
                          email: newClientData.email,
                          phone: newClientData.phone || undefined,
                        });
                        setClientId(id);
                        setShowNewClientForm(false);
                        toastManager.add({ type: "success", title: "Cliente creado", description: newClientData.name });
                      } catch {
                        toastManager.add({ type: "error", title: "Error", description: "No se pudo crear el cliente." });
                      } finally {
                        setCreatingClient(false);
                      }
                    }}
                  >
                    {creatingClient ? "Guardando..." : "Guardar cliente"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between border rounded-xl p-3 bg-primary/5 border-primary/20">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {clients?.find((c) => c._id === clientId)?.name || "Cargando..."}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setClientId("")} className="h-7 text-xs">
              Cambiar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Marca</Label>
          <Input placeholder="Ej. Toyota" value={make} onChange={(e) => setMake(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Input placeholder="Ej. Corolla" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Año (opcional)</Label>
          <Input type="number" placeholder="Ej. 2022" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Placa / Patente</Label>
          <Input placeholder="ABC-1234" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className="uppercase font-mono" />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Color del Vehículo</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_COLORS.map(({ label, hex, border }) => {
            const selected = color === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setColor(selected ? "" : label)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                  selected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40",
                ].join(" ")}
              >
                <span className={"h-3.5 w-3.5 rounded-full shrink-0 " + (border ? "border border-border" : "")} style={{ backgroundColor: hex }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kilometraje Actual</Label>
          <Input type="number" placeholder="Ej. 50000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>VIN (opcional)</Label>
          <Input
            placeholder="Ej. 1HGCM82633A004352"
            maxLength={17}
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            className="font-mono tracking-widest text-sm"
          />
        </div>
      </div>
    </form>
  );

  return (
    <Drawer position="right" open={open} onOpenChange={setOpen}>
      {openProp === undefined && (
        <DrawerTrigger
          render={
            trigger ?? (
              <Button className="gap-2">
                <Car01Icon className="size-4" />
                Nuevo Vehículo
              </Button>
            )
          }
        />
      )}
      <DrawerPopup
        variant="inset"
        className="max-w-md w-full h-full flex flex-col bg-background rounded-l-2xl border-l"
      >
        <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
          <DrawerTitle>{isEditing ? "Editar Vehículo" : "Nuevo Vehículo"}</DrawerTitle>
          <DrawerDescription>
            {isEditing ? "Modifica los datos del vehículo." : "Ingresa los datos para registrar un nuevo vehículo."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {formContent}
        </div>

        <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
          <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button
            type="submit"
            form="vehiculo-form"
            disabled={!isFormValid || submitting}
          >
            {submitting ? "Guardando..." : "Guardar Vehículo"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
