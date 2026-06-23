"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building04Icon, Cancel01Icon, Search01Icon } from "hugeicons-react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Drawer,
  DrawerTrigger,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { useOrg } from "@/components/providers/org-provider";
import { PlusSignIcon } from "hugeicons-react";
import { PrintTemplateButton } from "@/components/documentos/print-template-button";

export type InventoryDoc = {
  _id: Id<"inventory">;
  orgId: Id<"organizations">;
  name: string;
  sku?: string;
  code?: string;
  description?: string;
  categoryId: Id<"categories">;
  quantity: number;
  minQuantity?: number;
  costPrice?: number;
  salePrice: number;
  supplier?: string;
  supplierIds?: Id<"clients">[];
  location?: string;
  status: "Activo" | "Inactivo";
};

type InventoryFormMode = "create" | "edit" | "view";

type Supplier = { _id: Id<"clients">; name: string };

function SupplierMultiSelect({
  suppliers,
  selected,
  onChange,
  disabled,
}: {
  suppliers: Supplier[];
  selected: Id<"clients">[];
  onChange: (ids: Id<"clients">[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = new Set(selected);
  const selectedSuppliers = suppliers.filter((s) => selectedSet.has(s._id));
  const filtered = suppliers.filter(
    (s) => !selectedSet.has(s._id) && s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: Id<"clients">) => {
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  if (!suppliers.length) {
    return (
      <div className="space-y-1">
        <Label>Proveedores</Label>
        <p className="text-xs text-muted-foreground py-1">
          No hay proveedores registrados. Agrégalos en <strong>Clientes</strong> con tipo &quot;Proveedor&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <Label>Proveedores</Label>

      {/* Selected chips */}
      {selectedSuppliers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selectedSuppliers.map((s) => (
            <span
              key={s._id}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
            >
              <Building04Icon className="size-3 shrink-0" />
              {s.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(s._id)}
                  className="ml-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 p-0.5"
                  aria-label={`Quitar ${s.name}`}
                >
                  <Cancel01Icon className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      {!disabled && (
        <div className="relative">
          <div className="flex items-center gap-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Search01Icon className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder={selectedSuppliers.length ? "Agregar otro proveedor…" : "Buscar proveedor…"}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          {open && (filtered.length > 0 || search) && (
            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados.</p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); toggle(s._id); setSearch(""); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                  >
                    <Building04Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    {s.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InventoryForm({
  item,
  trigger,
  open: openProp,
  onOpenChange,
  mode = "create",
}: {
  item?: InventoryDoc;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: InventoryFormMode;
}) {
  const { orgId } = useOrg();
  const isEditing = mode === "edit";
  const isView = mode === "view";
  const createItem = useMutation(api.inventory.create);
  const updateItem = useMutation(api.inventory.update);
  const categories = useQuery(api.categories.list, orgId ? { orgId } : "skip");
  const orgSettings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const supplierList = useQuery(api.clients.get, orgId ? { orgId, type: "Proveedor" } : "skip");

  const calculatePrice = (cost: number, percentage: number, rounding: string) => {
    const rawPrice = cost * (1 + percentage / 100);
    switch (rounding) {
      case "nearest": return Math.round(rawPrice);
      case "up": return Math.ceil(rawPrice);
      case "down": return Math.floor(rawPrice);
      default: return Number(rawPrice.toFixed(2));
    }
  };

  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const buildFormData = (src?: InventoryDoc) => ({
    name: src?.name || "",
    sku: src?.sku || "",
    code: src?.code || "",
    description: src?.description || "",
    categoryId: src?.categoryId || "",
    quantity: src?.quantity ?? (1 as number | string),
    minQuantity: src?.minQuantity ?? (0 as number | string),
    costPrice: src?.costPrice ?? (0 as number | string),
    salePrice: src?.salePrice ?? (0 as number | string),
    supplier: src?.supplier || "",
    supplierIds: src?.supplierIds ?? ([] as Id<"clients">[]),
    location: src?.location || "",
    status: src?.status || "Activo",
  });

  const [formData, setFormData] = useState(() => buildFormData(item));

  useEffect(() => {
    setFormData(buildFormData(item));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isView) return;
    if (!formData.name.trim() || !formData.sku.trim() || !formData.code.trim() || !formData.categoryId) {
      return toastManager.add({ type: "error", title: "Error", description: "Nombre, SKU, Código y Categoría son obligatorios." });
    }

    try {
      const dataToSave = {
        ...formData,
        quantity: Number(formData.quantity) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        costPrice: Number(formData.costPrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        categoryId: formData.categoryId as Id<"categories">
      };

      if (isEditing) {
        await updateItem({ id: item!._id, ...dataToSave });
        toastManager.add({ type: "success", title: "Actualizado", description: "El artículo ha sido modificado." });
      } else {
        if (!orgId) throw new Error("No organization selected");
        await createItem({ ...dataToSave, orgId });
        toastManager.add({ type: "success", title: "Creado", description: "El artículo ha sido registrado." });
        setFormData({
          name: "", sku: "", code: "", description: "", categoryId: "", quantity: 1, minQuantity: 0, costPrice: 0, salePrice: 0, supplier: "", supplierIds: [], location: "", status: "Activo"
        });
      }
      setOpen(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: `No se pudo ${isEditing ? "actualizar" : "crear"} el artículo.` });
    }
  };

  const formContent = (
    <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4 px-4 overflow-y-auto">
      <div className="space-y-1">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={formData.name}
          readOnly={isView}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Filtro de aceite"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descripción</Label>
        <textarea
          id="description"
          value={formData.description}
          readOnly={isView}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Aplica para modelos..."
          className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="code">Código interno *</Label>
          <Input
            id="code"
            value={formData.code}
            readOnly={isView}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
            placeholder="INT-0001"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={formData.sku}
            readOnly={isView}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
            placeholder="FLT-1002"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="category">Categoría *</Label>
          <select
            id="category"
            value={formData.categoryId}
            disabled={isView}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="" disabled>
              Seleccionar...
            </option>
            {(categories || []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={formData.status}
            disabled={isView}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as "Activo" | "Inactivo" })
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="costPrice">Precio de Costo ($)</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.costPrice}
            readOnly={isView}
            onChange={(e) =>
              setFormData({
                ...formData,
                costPrice: e.target.value === "" ? "" : parseFloat(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="salePrice">Precio de Venta ($) *</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.salePrice}
            readOnly={isView}
            onChange={(e) =>
              setFormData({
                ...formData,
                salePrice: e.target.value === "" ? "" : parseFloat(e.target.value),
              })
            }
            required
          />
        </div>
      </div>

      {Number(formData.costPrice) > 0 && orgSettings?.profitPlans && orgSettings.profitPlans.length > 0 && (
        <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded-lg border border-dashed">
          <Label className="text-xs text-muted-foreground">Planes de rentabilidad sugeridos (clic para aplicar)</Label>
          <div className="flex flex-wrap gap-2">
            {orgSettings.profitPlans.map((plan) => {
              const suggestedPrice = calculatePrice(Number(formData.costPrice), plan.percentage, plan.rounding);
              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => !isView && setFormData({ ...formData, salePrice: suggestedPrice })}
                  disabled={isView}
                  className="flex flex-col items-start px-3 py-1.5 rounded-md border bg-background shadow-sm text-xs hover:bg-accent hover:border-accent-foreground/50 transition-colors cursor-pointer disabled:cursor-default"
                >
                  <span className="font-medium text-foreground">
                    {plan.name} <span className="text-muted-foreground font-normal">(+{plan.percentage}%)</span>
                  </span>
                  <span className="text-blue-600 font-semibold dark:text-blue-400">${suggestedPrice.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="quantity">Stock Actual *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            readOnly={isView}
            onChange={(e) =>
              setFormData({
                ...formData,
                quantity: e.target.value === "" ? "" : parseInt(e.target.value),
              })
            }
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="minQuantity">Stock Mínimo (Alerta)</Label>
          <Input
            id="minQuantity"
            type="number"
            min="0"
            value={formData.minQuantity}
            readOnly={isView}
            onChange={(e) =>
              setFormData({
                ...formData,
                minQuantity: e.target.value === "" ? "" : parseInt(e.target.value),
              })
            }
          />
        </div>
      </div>

      <SupplierMultiSelect
        suppliers={supplierList ?? []}
        selected={formData.supplierIds ?? []}
        onChange={(ids) => setFormData({ ...formData, supplierIds: ids })}
        disabled={isView}
      />

      <div className="space-y-1">
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          value={formData.location}
          readOnly={isView}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ej: Estante A2"
        />
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
                <PlusSignIcon className="size-4" />
                Nuevo Producto
              </Button>
            )
          }
          nativeButton
        />
      )}
      <DrawerPopup
        variant="inset"
        showCloseButton={isView}
        className="max-w-md w-full h-full flex flex-col bg-background rounded-l-2xl border-l"
      >
        <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
          <DrawerTitle>{isView ? "Ver Artículo" : isEditing ? "Editar Artículo" : "Nuevo Artículo"}</DrawerTitle>
          <DrawerDescription>
            {isView
              ? "Consulta los datos del repuesto en el inventario."
              : isEditing
                ? "Modifica los datos del repuesto en el inventario."
                : "Ingresa un nuevo repuesto al inventario."}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          {formContent}
        </div>

        {isView && item && orgId && (
          <DrawerFooter className="sticky bottom-0 z-10 shrink-0 px-4 py-4 border-t mt-4">
            <PrintTemplateButton
              kind="etiqueta"
              id={String(item._id)}
              orgId={String(orgId)}
              label="Imprimir etiqueta"
            />
          </DrawerFooter>
        )}

        {!isView && (
          <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
            <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
            <Button
              type="submit"
              form="inventory-form"
              className={
                isEditing
                  ? "border-emerald-700 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
                  : "border-zinc-900 bg-zinc-900 text-white hover:border-zinc-900 hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:border-zinc-100 dark:hover:bg-zinc-200"
              }
            >
              {isEditing ? "Guardar Cambios" : "Crear Artículo"}
            </Button>
          </DrawerFooter>
        )}
      </DrawerPopup>
    </Drawer>
  );
}
