"use client";

import { useState, useId } from "react";
import { useMutation } from "convex/react";
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
  DrawerPopup,
  DrawerTrigger,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { PlusSignIcon } from "hugeicons-react";
import { useOrg } from "@/components/providers/org-provider";

export type ServiceDoc = {
  _id: Id<"services">;
  orgId: Id<"organizations">;
  name: string;
  description?: string;
  billingType: "unit" | "hour";
  salePrice: number;
  costPrice: number;
  status: "Activo" | "Inactivo";
};

type Props = {
  service?: ServiceDoc;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  currency?: string;
};

export function ServiceForm({ service, trigger, open: openProp, onOpenChange, currency = "USD" }: Props) {
  const formId = useId();
  const { orgId } = useOrg();
  const isEditing = !!service;
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (next: boolean) => {
    setOpenInternal(next);
    onOpenChange?.(next);
  };

  const [formData, setFormData] = useState(() => ({
    name: service?.name || "",
    description: service?.description || "",
    billingType: service?.billingType || ("unit" as const),
    salePrice: service?.salePrice ?? (0 as number | string),
    costPrice: service?.costPrice ?? (0 as number | string),
    status: service?.status || ("Activo" as const),
  }));

  const formatMoneyLabel = `${currency}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "El nombre es obligatorio." });
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        billingType: formData.billingType,
        salePrice: Number(formData.salePrice) || 0,
        costPrice: Number(formData.costPrice) || 0,
        status: formData.status,
      };

      if (isEditing) {
        await updateService({ id: service._id, ...payload });
        toastManager.add({ type: "success", title: "Actualizado", description: "El servicio fue modificado." });
      } else {
        if (!orgId) throw new Error("No organization selected");
        await createService({ orgId, ...payload });
        toastManager.add({ type: "success", title: "Creado", description: "El servicio fue registrado." });
        setFormData({
          name: "",
          description: "",
          billingType: "unit",
          salePrice: 0,
          costPrice: 0,
          status: "Activo",
        });
      }
      setOpen(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: `No se pudo ${isEditing ? "actualizar" : "crear"} el servicio.` });
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={setOpen}>
      {openProp === undefined && (
        <DrawerTrigger
          render={
            trigger ?? (
              <Button className="gap-2">
                <PlusSignIcon className="size-4" />
                Nuevo Servicio
              </Button>
            )
          }
          nativeButton
        />
      )}
      <DrawerPopup variant="inset" className="max-w-md w-full flex flex-col h-full bg-background rounded-l-2xl border-l">
        <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
          <DrawerTitle>{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</DrawerTitle>
          <DrawerDescription>
            {isEditing ? "Ajusta el precio o la forma de cobro del servicio." : "Registra un servicio por unidad o por hora."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <form id={formId} onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${formId}`}>Nombre *</Label>
              <Input
                id={`name-${formId}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Alineación"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description-${formId}`}>Descripción</Label>
              <Input
                id={`description-${formId}`}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Alineación de las 4 ruedas"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`billingType-${formId}`}>Forma de cobro</Label>
                <select
                  id={`billingType-${formId}`}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.billingType}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value as "unit" | "hour" })}
                >
                  <option value="unit">Por unidad</option>
                  <option value="hour">Por hora</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`status-${formId}`}>Estado</Label>
                <select
                  id={`status-${formId}`}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "Activo" | "Inactivo" })}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`salePrice-${formId}`}>Precio de venta ({formatMoneyLabel}) *</Label>
                <Input
                  id={`salePrice-${formId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`costPrice-${formId}`}>Costo ({formatMoneyLabel}) *</Label>
                <Input
                  id={`costPrice-${formId}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Margen estimado</p>
              <p className="mt-1 text-lg font-semibold">
                {(Number(formData.salePrice) - Number(formData.costPrice)).toFixed(2)} {formatMoneyLabel}
              </p>
            </div>
          </form>
        </div>

        <DrawerFooter className="shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
          <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button type="submit" form={formId} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isEditing ? "Guardar Cambios" : "Crear Servicio"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
