"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { UserCircleIcon, Car01Icon, Alert01Icon, PlusSignIcon, PencilEdit01Icon } from "hugeicons-react";

// ─── Step indicators ───────────────────────────────────────────────────────────
function StepBadge({ n, label, icon: Icon }: { n: number; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {n}
      </span>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
    </div>
  );
}

// ─── Shared form state ─────────────────────────────────────────────────────────
type FormData = {
  clientId: string;
  vehicleId: string;
  isNewVehicle: boolean;
  newVehicle: {
    make: string;
    model: string;
    year: string;
    plate: string;
    color: string;
    vin: string;
  };
  symptoms: string;
  inspection: string;
  mileage: string;
};

const EMPTY: FormData = {
  clientId: "",
  vehicleId: "",
  isNewVehicle: false,
  newVehicle: {
    make: "",
    model: "",
    year: "",
    plate: "",
    color: "",
    vin: "",
  },
  symptoms: "",
  inspection: "",
  mileage: "",
};

interface OrdenFormProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  kind?: "orden" | "cotizacion";
  orderToEdit?: {
    _id: Id<"work_orders">;
    clientId: Id<"clients">;
    vehicleId?: Id<"vehicles">;
    symptoms?: string;
    issue?: string;
    inspection?: string;
    mileage?: number;
    nextMileage?: number;
  };
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function OrdenForm({ trigger, open: externalOpen, onOpenChange: externalOnOpenChange, orderToEdit, kind = "orden" }: OrdenFormProps) {
  const { orgId } = useOrg();
  const createOrder = useMutation(api.work_orders.create);
  const createCotizacion = useMutation(api.work_orders.createCotizacion);
  const updateOrderDetails = useMutation(api.work_orders.updateDetails);
  const createVehicle = useMutation(api.vehicles.create);
  const createClient = useMutation(api.clients.create);
  const clients = useQuery(api.clients.get, orgId ? { orgId, type: "Cliente" } : "skip");

  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [isEditingMileageForm, setIsEditingMileageForm] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // ── Client search state ─────────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState("");
  const [newClientData, setNewClientData] = useState({ name: "", email: "", phone: "" });
  const [creatingClient, setCreatingClient] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const continueStep1Ref = useRef<HTMLButtonElement>(null);
  const continueStep2Ref = useRef<HTMLButtonElement>(null);

  const vehicles = useQuery(
    api.vehicles.getByClient,
    (orgId && form.clientId) ? { orgId, clientId: form.clientId as Id<"clients"> } : "skip"
  );

  const reset = () => {
    setForm(EMPTY);
    setClientSearch("");
    setNewClientData({ name: "", email: "", phone: "" });
    setShowNewClientForm(false);
    setActiveIdx(-1);
    setIsEditingMileageForm(false);
  };

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevOrderToEdit, setPrevOrderToEdit] = useState(orderToEdit);

  if (open !== prevOpen || orderToEdit !== prevOrderToEdit) {
    setPrevOpen(open);
    setPrevOrderToEdit(orderToEdit);
    if (open) {
      if (orderToEdit) {
        setForm({
          ...EMPTY,
          clientId: orderToEdit.clientId,
          vehicleId: orderToEdit.vehicleId || "",
          isNewVehicle: false,
          inspection: orderToEdit.inspection || "",
          mileage: orderToEdit.mileage?.toString() || "",
        });
        setIsEditingMileageForm(false);
      } else {
        setForm(EMPTY);
        setClientSearch("");
        setNewClientData({ name: "", email: "", phone: "" });
        setShowNewClientForm(false);
        setActiveIdx(-1);
        setIsEditingMileageForm(false);
      }
    }
  }

  // ── Keyboard handler for client search ───────────────────────────────────
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
          setForm((d) => ({ ...d, clientId: list[activeIdx]!._id }));
          setClientSearch("");
          setActiveIdx(-1);
          // move focus to Continue button
          setTimeout(() => continueStep1Ref.current?.focus(), 50);
        } else if (list.length === 1) {
          // single result → auto-select
          setForm((d) => ({ ...d, clientId: list[0]!._id }));
          setClientSearch("");
          setActiveIdx(-1);
          setTimeout(() => continueStep1Ref.current?.focus(), 50);
        } else if (list.length === 0 && clientSearch) {
          // no results → open create form
          setNewClientData((d) => ({ ...d, name: clientSearch }));
          setShowNewClientForm(true);
          setClientSearch("");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (clientSearch) {
          setClientSearch("");
          setActiveIdx(-1);
        } else {
          setOpen(false);
        }
      }
    },
    [activeIdx, clientSearch, setOpen]
  );

  // Reset active index when search changes
  useEffect(() => {
    queueMicrotask(() => setActiveIdx(-1));
  }, [clientSearch]);

  // ── Validations ──────────────────────────────────────────────────────────────
  const canContinueStep1 = !!form.clientId;
  const canContinueStep2 =
    form.isNewVehicle
      ? !!(form.newVehicle?.plate && form.newVehicle?.make && form.newVehicle?.model)
      : !!form.vehicleId;

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (kind === "orden" && !form.symptoms.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "Detalla el motivo de ingreso." });
    }
    setSubmitting(true);
    try {
      let vehicleId = form.vehicleId;
      if (form.isNewVehicle) {
        if (!orgId) throw new Error("Org ID is required");
        vehicleId = await createVehicle({
          orgId,
          clientId: form.clientId as Id<"clients">,
          plate: form.newVehicle.plate,
          make: form.newVehicle.make,
          model: form.newVehicle.model,
          year: form.newVehicle.year ? parseInt(form.newVehicle.year) : undefined,
          color: form.newVehicle.color || undefined,
          vin: form.newVehicle.vin || undefined,
        });
      }
      if (orderToEdit) {
        await updateOrderDetails({
          id: orderToEdit._id,
          clientId: form.clientId as Id<"clients">,
          vehicleId: vehicleId as Id<"vehicles">,
          symptoms: form.symptoms,
          inspection: form.inspection,
          mileage: form.mileage ? parseInt(form.mileage) : undefined,
        });
        toastManager.add({ type: "success", title: "Orden actualizada", description: "Los detalles han sido guardados." });
      } else if (kind === "cotizacion") {
        if (!orgId) throw new Error("Org ID is required");
        await createCotizacion({
          orgId,
          clientId: form.clientId as Id<"clients">,
          vehicleId: vehicleId ? vehicleId as Id<"vehicles"> : undefined,
          symptoms: form.symptoms,
          inspection: form.inspection,
          mileage: form.mileage ? parseInt(form.mileage) : undefined,
        });
        toastManager.add({ type: "success", title: "Cotización creada", description: "Puedes agregar ítems y luego imprimir o convertir a ODT." });
      } else {
        if (!orgId) throw new Error("Org ID is required");
        await createOrder({
          orgId,
          clientId: form.clientId as Id<"clients">,
          vehicleId: vehicleId as Id<"vehicles">,
          symptoms: form.symptoms,
          inspection: form.inspection,
          mileage: form.mileage ? parseInt(form.mileage) : undefined,
        });
        toastManager.add({ type: "success", title: "Orden creada", description: "Vehículo ingresado exitosamente." });
      }
      setOpen(false);
      setTimeout(reset, 400);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "Hubo un problema al guardar la orden." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // ── DRAWER NIVEL 1: Paso 1 — Cliente ────────────────────────────────────────
    <Drawer open={open} onOpenChange={(val) => { setOpen(val); if (!val) setTimeout(reset, 400); }}>
      {externalOpen === undefined && trigger !== null && (
        <DrawerTrigger render={(trigger as any) || <Button onClick={() => setOpen(true)} />}>
          {trigger ? undefined : (
            <><PlusSignIcon className="h-4 w-4 mr-1.5" />Nueva Orden</>
          )}
        </DrawerTrigger>
      )}

      <DrawerPopup showBar className="sm:max-w-2xl sm:mx-auto sm:min-h-[70vh]">
        <DrawerHeader className="text-center">
          <StepBadge n={1} label="Paso 1 de 3" icon={UserCircleIcon} />
          <DrawerTitle className="mt-2">{orderToEdit ? "Editar Cliente" : kind === "cotizacion" ? "Nueva Cotización — Cliente" : "Seleccionar Cliente"}</DrawerTitle>
          <DrawerDescription>¿A quién le pertenece esta orden de trabajo?</DrawerDescription>
        </DrawerHeader>

        <DrawerPanel>
          <div className="space-y-3">

            {/* Buscador */}
            <div className="relative">
              <Input
                ref={searchRef}
                placeholder="Buscar cliente... (↑↓ navegar, Enter seleccionar, Esc cerrar)"
                value={clientSearch}
                autoFocus
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setForm((d) => ({ ...d, clientId: "" }));
                  setShowNewClientForm(false);
                }}
                onKeyDown={(e) => {
                  const filtered = (clients ?? []).filter((c) =>
                    c.name.toLowerCase().includes(clientSearch.toLowerCase())
                  );
                  handleSearchKey(e, filtered);
                }}
              />
              {clientSearch && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  onClick={() => { setClientSearch(""); searchRef.current?.focus(); }}
                >
                  Esc
                </button>
              )}
            </div>

            {/* Lista filtrada */}
            {!showNewClientForm && (() => {
              const filtered = (clients ?? []).filter((c) =>
                c.name.toLowerCase().includes(clientSearch.toLowerCase())
              );
              const selected = clients?.find((c) => c._id === form.clientId);

              return (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1" role="listbox">
                  {selected && !clientSearch && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-2.5 text-left transition-all"
                      onClick={() => { setForm((d) => ({ ...d, clientId: "" })); searchRef.current?.focus(); }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {selected.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{selected.name}</p>
                        {selected.phone && <p className="text-xs text-muted-foreground">{selected.phone}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:block">Clic para cambiar</span>
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )}

                  {clientSearch && filtered.map((c, i) => (
                    <button
                      key={c._id}
                      ref={(el) => { itemRefs.current[i] = el; }}
                      type="button"
                      role="option"
                      aria-selected={activeIdx === i}
                      onClick={() => {
                        setForm((d) => ({ ...d, clientId: c._id }));
                        setClientSearch("");
                        setActiveIdx(-1);
                        setTimeout(() => continueStep1Ref.current?.focus(), 50);
                      }}
                      className={[
                        "w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all",
                        activeIdx === i
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <div className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        activeIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      ].join(" ")}>
                        {c.name[0].toUpperCase()}
                      </div>
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
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted-foreground">No se encontró &ldquo;{clientSearch}&rdquo;</p>
                      <p className="text-xs text-muted-foreground">Presiona <kbd className="bg-muted border rounded px-1.5 py-0.5">Enter</kbd> para crear este cliente</p>
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
                        + Crear cliente &ldquo;{clientSearch}&rdquo;
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Formulario creación rápida */}
            {showNewClientForm && (
              <div className="space-y-3 border rounded-xl p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Nuevo cliente</p>
                  <span className="text-xs text-muted-foreground">Tab navega · Enter guarda</span>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    autoFocus
                    placeholder="Juan Pérez"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((d) => ({ ...d, name: e.target.value }))}
                    onKeyDown={(e) => e.key === "Escape" && setShowNewClientForm(false)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono (opcional)</Label>
                  <Input
                    placeholder="+1 555 000 0000"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData((d) => ({ ...d, phone: e.target.value }))}
                    onKeyDown={(e) => e.key === "Escape" && setShowNewClientForm(false)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="juan@email.com"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData((d) => ({ ...d, email: e.target.value }))}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") { setShowNewClientForm(false); return; }
                      if (e.key === "Enter" && newClientData.name && newClientData.email) {
                        e.preventDefault();
                        setCreatingClient(true);
                        try {
                          if (!orgId) throw new Error("Org ID is required");
                          const id = await createClient({
                            orgId,
                            roles: ["Cliente"],
                            name: newClientData.name,
                            email: newClientData.email,
                            phone: newClientData.phone || undefined,
                          });
                          setForm((d) => ({ ...d, clientId: id }));
                          toastManager.add({ type: "success", title: "Cliente creado", description: newClientData.name });
                          setShowNewClientForm(false);
                          setTimeout(() => continueStep1Ref.current?.focus(), 50);
                        } catch {
                          toastManager.add({ type: "error", title: "Error", description: "No se pudo crear el cliente." });
                        } finally {
                          setCreatingClient(false);
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewClientForm(false)}
                    className="flex-1"
                  >
                    Cancelar <kbd className="ml-1 text-[10px] bg-background border rounded px-1">Esc</kbd>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={creatingClient || !newClientData.name || !newClientData.email}
                    onClick={async () => {
                      setCreatingClient(true);
                      try {
                        if (!orgId) throw new Error("Org ID is required");
                        const id = await createClient({
                          orgId,
                          roles: ["Cliente"],
                          name: newClientData.name,
                          email: newClientData.email,
                          phone: newClientData.phone || undefined,
                        });
                        setForm((d) => ({ ...d, clientId: id }));
                        toastManager.add({ type: "success", title: "Cliente creado", description: newClientData.name });
                        setShowNewClientForm(false);
                        setTimeout(() => continueStep1Ref.current?.focus(), 50);
                      } catch {
                        toastManager.add({ type: "error", title: "Error", description: "No se pudo crear el cliente." });
                      } finally {
                        setCreatingClient(false);
                      }
                    }}
                  >
                    {creatingClient ? "Guardando..." : "Guardar"} <kbd className="ml-1 text-[10px] bg-primary-foreground/20 rounded px-1">Enter</kbd>
                  </Button>
                </div>
              </div>
            )}

          </div>
        </DrawerPanel>

        <DrawerFooter className="justify-center sm:justify-center" variant="bare">
          <DrawerClose render={<Button variant="ghost" />}>Cancelar</DrawerClose>

          {/* ── DRAWER NIVEL 2: Paso 2 — Vehículo ──────────────────────── */}
          <Drawer>
            <DrawerTrigger
              disabled={!canContinueStep1}
              render={
                <Button
                  ref={continueStep1Ref}
                  disabled={!canContinueStep1}
                />
              }
            >
              Continuar
            </DrawerTrigger>

            <DrawerPopup showBar className="sm:max-w-2xl sm:mx-auto sm:min-h-[70vh]">
              <DrawerHeader className="text-center">
                <StepBadge n={2} label="Paso 2 de 3" icon={Car01Icon} />
                <DrawerTitle className="mt-2">Vehículo</DrawerTitle>
                <DrawerDescription>Selecciona o registra el vehículo que ingresa.</DrawerDescription>
              </DrawerHeader>

              <DrawerPanel>
                <div className="space-y-4">
                  {/* Toggle existente / nuevo */}
                  <div className="grid grid-cols-2 gap-2 border-b pb-4">
                    <Button
                      variant={!form.isNewVehicle ? "default" : "outline"}
                      onClick={() => setForm((d) => ({ ...d, isNewVehicle: false, vehicleId: "" }))}
                    >
                      Existente
                    </Button>
                    <Button
                      variant={form.isNewVehicle ? "default" : "outline"}
                      onClick={() => setForm((d) => ({ ...d, isNewVehicle: true, vehicleId: "" }))}
                    >
                      Nuevo
                    </Button>
                  </div>

                  {!form.isNewVehicle ? (
                    <div className="space-y-3">
                      <Label>Vehículo del cliente</Label>
                      {vehicles && vehicles.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {vehicles.map((v) => {
                            const selected = form.vehicleId === v._id;
                            return (
                              <button
                                key={v._id}
                                type="button"
                                onClick={() => {
                                  setForm((d) => ({ 
                                    ...d, 
                                    vehicleId: v._id,
                                    mileage: v.mileage?.toString() || d.mileage,
                                  }));
                                  setTimeout(() => continueStep2Ref.current?.focus(), 50);
                                }}
                                className={[
                                  "w-full text-left flex items-center gap-4 rounded-xl border-2 px-4 py-3 transition-all duration-150",
                                  selected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                                ].join(" ")}
                              >
                                <div className={[
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                ].join(" ")}>
                                  <Car01Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">
                                    {v.make} {v.model}{v.year ? ` · ${v.year}` : ""}
                                  </p>
                                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
                                    {v.plate}
                                  </p>
                                </div>
                                {selected && (
                                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M2 6l3 3 5-5" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
                          Este cliente no tiene vehículos registrados.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Marca - Modelo */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Marca</Label>
                          <Input
                            placeholder="Toyota"
                            value={form.newVehicle.make}
                            onChange={(e) => setForm((d) => ({ ...d, newVehicle: { ...d.newVehicle, make: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Input
                            placeholder="Corolla"
                            value={form.newVehicle.model}
                            onChange={(e) => setForm((d) => ({ ...d, newVehicle: { ...d.newVehicle, model: e.target.value } }))}
                          />
                        </div>
                      </div>

                      {/* Año - Placa */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Año (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="2022"
                            value={form.newVehicle.year}
                            onChange={(e) => setForm((d) => ({ ...d, newVehicle: { ...d.newVehicle, year: e.target.value } }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Placa / Patente</Label>
                          <Input
                            placeholder="Ej. ABC-123"
                            value={form.newVehicle.plate}
                            onChange={(e) => setForm((d) => ({ ...d, newVehicle: { ...d.newVehicle, plate: e.target.value.toUpperCase() } }))}
                          />
                        </div>
                      </div>
                       <div className="space-y-2">
                        <Label>Color (opcional)</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
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
                            { label: "Morado",   hex: "#7c3aed" },
                          ].map(({ label, hex, border }) => {
                            const selected = form.newVehicle.color === label;
                            return (
                              <button
                                key={label}
                                type="button"
                                title={label}
                                onClick={() => setForm((d) => ({
                                  ...d,
                                  newVehicle: { ...d.newVehicle, color: selected ? "" : label }
                                }))}
                                className={[
                                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                                  selected
                                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                    : "border-border hover:border-primary/40",
                                ].join(" ")}
                              >
                                <span
                                  className={"h-3.5 w-3.5 rounded-full shrink-0 " + (border ? "border border-border" : "")}
                                  style={{ backgroundColor: hex }}
                                />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* VIN */}
                      <div className="space-y-2">
                        <Label>VIN (opcional)</Label>
                        <Input
                          placeholder="Ej. 1HGCM82633A004352"
                          maxLength={17}
                          value={form.newVehicle.vin}
                          onChange={(e) => setForm((d) => ({ ...d, newVehicle: { ...d.newVehicle, vin: e.target.value.toUpperCase() } }))}
                          className="font-mono tracking-widest text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Número de identificación vehicular (17 caracteres)</p>
                      </div>
                    </div>
                  )}
                </div>
              </DrawerPanel>

              <DrawerFooter className="justify-center sm:justify-center" variant="bare">
                <DrawerClose render={<Button variant="ghost" />}>Atrás</DrawerClose>

                {/* ── DRAWER NIVEL 3: Paso 3 — Diagnóstico ────────────────────── */}
                <Drawer>
                  <DrawerTrigger
                    disabled={!canContinueStep2}
                    render={
                      <Button
                        ref={continueStep2Ref}
                        disabled={!canContinueStep2}
                      />
                    }
                  >
                    Continuar
                  </DrawerTrigger>

                  <DrawerPopup showBar className="sm:max-w-2xl sm:mx-auto sm:min-h-[70vh]">
                    <DrawerHeader className="text-center">
                      <StepBadge n={3} label="Paso 3 de 3" icon={Alert01Icon} />
                      <DrawerTitle className="mt-2">Inspección y Diagnóstico</DrawerTitle>
                      <DrawerDescription>Detalla el motivo del ingreso del vehículo.</DrawerDescription>
                    </DrawerHeader>

                    <DrawerPanel>
                      <div className="space-y-4">
                        <div className="bg-muted/40 p-4 rounded-xl border border-border/50 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <Label>Kilometraje de Ingreso</Label>
                            {!isEditingMileageForm && (
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={() => setIsEditingMileageForm(true)}>
                                <PencilEdit01Icon className="h-3 w-3 mr-1" /> Editar
                              </Button>
                            )}
                          </div>
                          
                          {isEditingMileageForm ? (
                            <Input 
                              type="number" 
                              placeholder="Ej. 50000" 
                              value={form.mileage} 
                              onChange={(e) => setForm(d => ({...d, mileage: e.target.value}))} 
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  setIsEditingMileageForm(false);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="text-2xl font-bold font-mono">
                              {form.mileage ? `${Number(form.mileage).toLocaleString()} km` : "--"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="symptoms">Motivo de ingreso</Label>
                          <Textarea
                            id="symptoms"
                            placeholder="¿Por qué ingresa el vehículo? Ej. Sonido al frenar, cambio de aceite..."
                            className="min-h-[110px]"
                            value={form.symptoms}
                            onChange={(e) => setForm((d) => ({ ...d, symptoms: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inspection">Inspección inicial (opcional)</Label>
                          <Textarea
                            id="inspection"
                            placeholder="Rayones, nivel de gasolina, estado general..."
                            className="min-h-[80px]"
                            value={form.inspection}
                            onChange={(e) => setForm((d) => ({ ...d, inspection: e.target.value }))}
                          />
                        </div>
                      </div>
                    </DrawerPanel>

                    <DrawerFooter className="justify-center sm:justify-center" variant="bare">
                      <DrawerClose render={<Button variant="ghost" />}>Atrás</DrawerClose>
                      <Button
                        disabled={submitting || !form.symptoms.trim()}
                        onClick={() => handleSubmit()}
                      >
                        {submitting ? "Guardando..." : (orderToEdit ? "Guardar Cambios" : kind === "cotizacion" ? "Crear Cotización" : "Confirmar Ingreso")}
                      </Button>
                    </DrawerFooter>

                  </DrawerPopup>
                </Drawer>
                {/* ── fin paso 3 ── */}

              </DrawerFooter>
            </DrawerPopup>
          </Drawer>
          {/* ── fin paso 2 ── */}

        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
    // ── fin paso 1 ──
  );
}
