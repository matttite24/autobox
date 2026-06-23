"use client";

import { useState } from "react";
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
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { Alert01Icon, DashboardSpeed01Icon, Delete02Icon, PencilEdit01Icon } from "hugeicons-react";

interface OrderMileageDrawerProps {
  orderId: Id<"work_orders">;
  currentMileage?: number;
  nextMileage?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderMileageDrawer({ orderId, currentMileage, nextMileage, open, onOpenChange }: OrderMileageDrawerProps) {
  const updateMileage = useMutation(api.work_orders.updateMileage);

  const [newCurrentMileage, setNewCurrentMileage] = useState<string | number>(
    currentMileage ?? ""
  );
  const [newNextMileage, setNewNextMileage] = useState<string | number>(
    nextMileage ?? (currentMileage !== undefined ? currentMileage + 5000 : "")
  );
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);

  const handleOpenChange = (val: boolean) => {
    if (val) {
      setNewCurrentMileage(currentMileage ?? "");
      setNewNextMileage(nextMileage ?? (currentMileage !== undefined ? currentMileage + 5000 : ""));
      setIsEditingCurrent(false);
    }
    onOpenChange(val);
  };

  const handleClose = () => {
    setNewCurrentMileage(currentMileage ?? "");
    setNewNextMileage(nextMileage ?? (currentMileage !== undefined ? currentMileage + 5000 : ""));
    setIsEditingCurrent(false);
    onOpenChange(false);
  };

  const handleAdd = (amount: number) => {
    const base = Number(newCurrentMileage) || currentMileage || 0;
    setNewNextMileage(base + amount);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedNext = Number(newNextMileage) || undefined;
    const parsedCurrent = Number(newCurrentMileage) || undefined;

    if (parsedNext === undefined && parsedCurrent === undefined) return;

    try {
      await updateMileage({
        id: orderId,
        mileage: parsedCurrent,
        nextMileage: parsedNext
      });
      toastManager.add({ type: "success", title: "Actualizado", description: "Kilometraje guardado exitosamente." });
      setIsEditingCurrent(false);
      // No cerramos el drawer para que el usuario vea el cambio reflejado
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo actualizar el kilometraje." });
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={handleOpenChange}>
      <DrawerPopup variant="inset" className="max-w-sm">
        <DrawerHeader className="border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <DashboardSpeed01Icon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </div>
            <DrawerTitle>Seguimiento de Aceite</DrawerTitle>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <DrawerPanel className="grid gap-6 !pt-6">

            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label>Kilometraje Actual</Label>
                {!isEditingCurrent && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={() => setIsEditingCurrent(true)}>
                    <PencilEdit01Icon className="h-3 w-3 mr-1" /> Editar
                  </Button>
                )}
              </div>

              {isEditingCurrent ? (
                <Input
                  type="number"
                  min={0}
                  placeholder="Ej. 50000"
                  value={newCurrentMileage}
                  onChange={(e) => setNewCurrentMileage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setIsEditingCurrent(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <span className="text-2xl font-bold font-mono">
                  {currentMileage !== undefined ? `${currentMileage.toLocaleString()} km` : "--"}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <Label>Próximo Cambio de Aceite a los (km)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  autoFocus
                  type="number"
                  min={Number(newCurrentMileage) || 0}
                  value={newNextMileage}
                  onChange={(e) => setNewNextMileage(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="secondary" size="sm" className="flex-1 h-8 text-xs font-medium" onClick={() => handleAdd(3000)}>+3,000</Button>
                <Button type="button" variant="secondary" size="sm" className="flex-1 h-8 text-xs font-medium" onClick={() => handleAdd(5000)}>+5,000</Button>
                <Button type="button" variant="secondary" size="sm" className="flex-1 h-8 text-xs font-medium" onClick={() => handleAdd(10000)}>+10,000</Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                <Alert01Icon className="h-3 w-3" />
                Se usa para notificar al cliente sobre su próximo servicio.
              </p>
            </div>

            {/* Servicio Programado Activo */}
            {nextMileage !== undefined && (
              <div className="mt-2 border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Servicio Programado</h4>
                <div className="flex justify-between items-center p-3 bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-md">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-amber-900 dark:text-amber-400">Próximo Cambio de Aceite</span>
                    <span className="text-xs font-medium text-amber-700/80 dark:text-amber-500/80 mt-0.5">
                      A los {nextMileage.toLocaleString()} km
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                    title="Eliminar recordatorio"
                    onClick={async () => {
                      if (confirm("¿Eliminar este recordatorio?")) {
                        await updateMileage({ id: orderId, nextMileage: undefined });
                        setNewNextMileage("");
                        toastManager.add({ type: "success", title: "Eliminado", description: "Recordatorio removido." });
                      }
                    }}
                  >
                    <Delete02Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

          </DrawerPanel>

          <DrawerFooter>
            <DrawerClose render={<Button variant="ghost" type="button" onClick={handleClose} />}>Cancelar</DrawerClose>
            <Button type="submit">Guardar Cambios</Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
