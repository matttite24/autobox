"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { Search01Icon, Settings01Icon, Briefcase01Icon, PencilEdit01Icon } from "hugeicons-react";

type OrderItem = {
  id: string;
  type: "part" | "labor" | "service";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type InventoryItem = {
  _id: Id<"inventory">;
  name: string;
  sku: string;
  code: string;
  description?: string;
  quantity: number;
  costPrice?: number;
  salePrice: number;
  status: "Activo" | "Inactivo";
};

type ProfitPlan = {
  id: string;
  name: string;
  percentage: number;
  rounding: "none" | "nearest" | "up" | "down";
};

interface OrderAddItemDrawerProps {
  entityId: Id<"work_orders"> | Id<"sales">;
  entityType?: "order" | "sale";
  orgId: Id<"organizations">;
  items: OrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // If editing an existing item
  itemToEdit?: OrderItem | null;
  onEditComplete?: () => void;
}

export function OrderAddItemDrawer({ 
  entityId, 
  entityType = "order",
  orgId, 
  items, 
  open, 
  onOpenChange,
  itemToEdit,
  onEditComplete
}: OrderAddItemDrawerProps) {
  const updateOrderItems = useMutation(api.work_orders.updateItems);
  const updateSaleItems = useMutation(api.sales.updateItems);

  const [itemMode, setItemMode] = useState<"inventory" | "services" | "manual">("inventory");
  const [inventorySearch, setInventorySearch] = useState("");
  const [debouncedInventorySearch, setDebouncedInventorySearch] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [selectedProfitPlanId, setSelectedProfitPlanId] = useState<string>("");
  const [showProfitPlans, setShowProfitPlans] = useState(false);
  
  const [newItem, setNewItem] = useState({
    type: "part" as "part" | "labor" | "service",
    description: "",
    quantity: 1 as number | string,
    unitPrice: 0 as number | string,
  });

  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const inventory = useQuery(
    api.inventory.get,
    orgId ? { orgId, categoryId: undefined } : "skip",
  ) as InventoryItem[] | undefined;
  const services = useQuery(
    api.services.get,
    orgId ? { orgId, status: "Activo" } : "skip",
  ) as { _id: Id<"services">; name: string; description?: string; billingType: "unit" | "hour"; salePrice: number; costPrice: number; status: "Activo" | "Inactivo" }[] | undefined;

  // Initialize form when opened or when itemToEdit changes
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (open) {
      if (itemToEdit) {
        setInventorySearch(itemToEdit.type === "part" ? itemToEdit.description : "");
        setDebouncedInventorySearch(itemToEdit.type === "part" ? itemToEdit.description : "");
        setItemMode(itemToEdit.type === "part" ? "inventory" : "services");
        setSelectedInventoryItem(null);
        setShowProfitPlans(false);
        setNewItem({
          type: itemToEdit.type,
          description: itemToEdit.description,
          quantity: itemToEdit.quantity,
          unitPrice: itemToEdit.unitPrice,
        });
      } else {
        setInventorySearch("");
        setDebouncedInventorySearch("");
        setItemMode("inventory");
        setSelectedInventoryItem(null);
        setShowProfitPlans(false);
        setNewItem({ type: "part", description: "", quantity: 1, unitPrice: 0 });
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, itemToEdit]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedInventorySearch(inventorySearch.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [inventorySearch]);

  const visibleInventory = (inventory || []).filter((item) => {
    if (!debouncedInventorySearch) return true;
    const term = debouncedInventorySearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.sku || item.code).toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term)
    );
  });

  const visibleServices = (services || []).filter((service) => {
    if (!debouncedInventorySearch) return true;
    const term = debouncedInventorySearch.toLowerCase();
    return (
      service.name.toLowerCase().includes(term) ||
      (service.description || "").toLowerCase().includes(term) ||
      service.billingType.toLowerCase().includes(term)
    );
  });

  const plans = (settings?.profitPlans || []) as ProfitPlan[];
  const taxRate = settings?.taxRate ?? 15;

  const handleAddInventoryItem = async (item: InventoryItem) => {
    const existingItem = items.find(
      (orderItem) =>
        orderItem.type === "part" &&
        orderItem.description === (item.description?.trim() || item.name) &&
        orderItem.unitPrice === item.salePrice &&
        (!itemToEdit || orderItem.id !== itemToEdit.id)
    );

    const orderItem: OrderItem = existingItem
      ? {
          ...existingItem,
          quantity: existingItem.quantity + 1,
          total: (existingItem.quantity + 1) * existingItem.unitPrice,
        }
      : {
          id: itemToEdit?.id || crypto.randomUUID(),
          type: "part",
          description: item.description?.trim() || item.name,
          quantity: itemToEdit ? itemToEdit.quantity : 1,
          unitPrice: item.salePrice,
          total: (itemToEdit ? itemToEdit.quantity : 1) * item.salePrice,
        };

    try {
      let updatedItems;
      if (existingItem) {
        updatedItems = items.map((currentItem) => (currentItem.id === existingItem.id ? orderItem : currentItem));
      } else if (itemToEdit) {
        updatedItems = items.map((currentItem) => (currentItem.id === itemToEdit.id ? orderItem : currentItem));
      } else {
        updatedItems = [...items, orderItem];
      }

      if (entityType === "sale") {
        await updateSaleItems({
          id: entityId as Id<"sales">,
          items: updatedItems,
        });
      } else {
        await updateOrderItems({
          id: entityId as Id<"work_orders">,
          items: updatedItems,
        });
      }
      toastManager.add({
        type: "success",
        title: existingItem ? "Producto acumulado" : "Producto agregado",
        description: existingItem
          ? `${item.name} aumentó su cantidad en la orden.`
          : `${item.name} se añadió a la orden.`,
      });
      if (itemToEdit && onEditComplete) onEditComplete();
      if (!existingItem && !itemToEdit) {
        // If adding a new item from inventory, close it or keep it open?
        // Original behavior didn't close it, wait yes it kept it open.
      }
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo agregar el producto." });
    }
  };

  const handleAddServiceItem = async (service: NonNullable<typeof services>[number]) => {
    const orderItem: OrderItem = {
      id: crypto.randomUUID(),
      type: "service",
      description: service.name,
      quantity: 1,
      unitPrice: service.salePrice,
      total: service.salePrice,
    };

    const updatedItems = [...items, orderItem];

    try {
      if (entityType === "sale") {
        await updateSaleItems({
          id: entityId as Id<"sales">,
          items: updatedItems,
        });
      } else {
        await updateOrderItems({
          id: entityId as Id<"work_orders">,
          items: updatedItems,
        });
      }

      toastManager.add({
        type: "success",
        title: "Servicio agregado",
        description: `${service.name} se añadió a la orden.`,
      });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo agregar el servicio." });
    }
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItem.description.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "La descripción es requerida." });
    }
    const quantityNum = Number(newItem.quantity) || 0;
    const unitPriceNum = Number(newItem.unitPrice) || 0;

    if (unitPriceNum <= 0) {
      return toastManager.add({ type: "error", title: "Error", description: "El precio debe ser mayor a 0." });
    }

    const item = {
      id: itemToEdit?.id || crypto.randomUUID(),
      type: newItem.type,
      description: newItem.description,
      quantity: quantityNum,
      unitPrice: unitPriceNum,
      total: quantityNum * unitPriceNum,
    };

    let updatedItems;
    if (itemToEdit) {
      updatedItems = items.map((i) => i.id === itemToEdit.id ? item : i);
    } else {
      updatedItems = [...items, item];
    }

    try {
      if (entityType === "sale") {
        await updateSaleItems({
          id: entityId as Id<"sales">,
          items: updatedItems,
        });
      } else {
        await updateOrderItems({
          id: entityId as Id<"work_orders">,
          items: updatedItems,
        });
      }
      
      toastManager.add({ 
        type: "success", 
        title: itemToEdit ? "Item actualizado" : "Item añadido", 
        description: "El registro se guardó correctamente." 
      });
      
      setNewItem({ type: "part", description: "", quantity: 1, unitPrice: 0 });
      setItemMode("inventory");
      if (itemToEdit && onEditComplete) onEditComplete();
      onOpenChange(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo guardar el item." });
    }
  };

  function calculatePriceFromPlan(cost: number, percentage: number, rounding: ProfitPlan["rounding"]) {
    const raw = cost * (1 + percentage / 100);
    const value = rounding === "up"
      ? Math.ceil(raw)
      : rounding === "down"
        ? Math.floor(raw)
        : rounding === "nearest"
          ? Math.round(raw)
          : raw;
    return Number(value.toFixed(2));
  }

  const handleSelectInventoryItem = (item: InventoryItem) => {
    const plans = (settings?.profitPlans || []) as ProfitPlan[];
    const defaultPlanId = settings?.defaultProfitPlanId || plans[0]?.id || "";
    const defaultPlan = plans.find((p) => p.id === defaultPlanId) || plans[0] || null;
    const unitPrice = defaultPlan
      ? calculatePriceFromPlan(item.costPrice ?? 0, defaultPlan.percentage, defaultPlan.rounding)
      : item.salePrice;
    setSelectedInventoryItem(item);
    setSelectedProfitPlanId(defaultPlanId);
    setShowProfitPlans(false);
    setItemMode("inventory");
    setInventorySearch(item.name);
    setNewItem({
      type: "part",
      description: item.description?.trim() || item.name,
      quantity: 1,
      unitPrice,
    });
  };

  const handleEditInventoryItem = (item: InventoryItem) => {
    handleSelectInventoryItem(item);
    setShowProfitPlans(true);
  };

  const handleAddSelectedInventoryItem = async () => {
    if (!selectedInventoryItem) return;
    const price = Number(newItem.unitPrice) || selectedInventoryItem.salePrice;
    const quantity = Number(newItem.quantity) || 1;
    const orderItem: OrderItem = {
      id: itemToEdit?.id || crypto.randomUUID(),
      type: "part",
      description: newItem.description.trim() || selectedInventoryItem.description?.trim() || selectedInventoryItem.name,
      quantity,
      unitPrice: price,
      total: quantity * price,
    };

    const updatedItems = itemToEdit
      ? items.map((currentItem) => (currentItem.id === itemToEdit.id ? orderItem : currentItem))
      : [...items, orderItem];

    try {
      if (entityType === "sale") {
        await updateSaleItems({ id: entityId as Id<"sales">, items: updatedItems });
      } else {
        await updateOrderItems({ id: entityId as Id<"work_orders">, items: updatedItems });
      }
      toastManager.add({
        type: "success",
        title: itemToEdit ? "Item actualizado" : "Item añadido",
        description: "El registro se guardó correctamente.",
      });
      setSelectedInventoryItem(null);
      setShowProfitPlans(false);
      setNewItem({ type: "part", description: "", quantity: 1, unitPrice: 0 });
      if (itemToEdit && onEditComplete) onEditComplete();
      onOpenChange(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo guardar el item." });
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={onOpenChange}>
      <DrawerPopup variant="inset">
        <DrawerHeader>
        </DrawerHeader>
        
        <form onSubmit={handleAddItem} className="flex flex-col flex-1 min-h-0">
          <DrawerPanel className="grid gap-6">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant={itemMode === "inventory" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setItemMode("inventory");
                    setInventorySearch("");
                    setNewItem({ ...newItem, type: "part" });
                  }}
                >
                  <Settings01Icon className="mr-2 h-4 w-4" /> Inventario
                </Button>
                <Button 
                  type="button"
                  variant={itemMode === "services" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setItemMode("services");
                    setInventorySearch("");
                    setNewItem({ ...newItem, type: "labor" });
                  }}
                >
                  <Briefcase01Icon className="mr-2 h-4 w-4" /> Servicios
                </Button>
                <Button 
                  type="button"
                  variant={itemMode === "manual" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setItemMode("manual");
                    setInventorySearch("");
                    if (!itemToEdit) setNewItem({ type: "part", description: "", quantity: 1, unitPrice: 0 });
                  }}
                >
                  <PencilEdit01Icon className="mr-2 h-4 w-4" /> Manual
                </Button>
              </div>
            </div>

            {itemMode === "inventory" ? (
              <>
                <div className="space-y-2">
                  <Label>Buscar en Inventario</Label>
                  <div className="relative">
                      <Search01Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="search"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Buscar repuesto por nombre o código"
                        className="pl-9"
                        autoComplete="off"
                      />
                    </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/20">
                    {visibleInventory.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">
                        No hay productos que coincidan con la búsqueda.
                      </p>
                    ) : (
                      visibleInventory.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleAddInventoryItem(item)}
                        role="button"
                        tabIndex={0}
                        className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/60 ${
                          selectedInventoryItem?._id === item._id ? "bg-muted/50" : ""
                        }`}
                      >
                          <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                              {(item.sku || item.code)} · Stock {item.quantity}
                          </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold">
                              ${item.salePrice.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground"
                              aria-label={`Editar planes de ${item.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInventoryItem(item);
                              }}
                            >
                              <PencilEdit01Icon className="size-3.5" />
                            </button>
                          </div>
                      </div>
                      ))
                    )}
                  </div>
                  {showProfitPlans && selectedInventoryItem ? (
                    <div className="space-y-2 rounded-xl border bg-background p-3 mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-semibold">Editar: {selectedInventoryItem.name}</Label>
                        <span className="text-[11px] text-muted-foreground">IVA {taxRate}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="listQuantity">Cantidad</Label>
                          <Input
                            id="listQuantity"
                            type="number"
                            min="1"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listPrice">Precio editable ($) + IVA</Label>
                          <Input
                            id="listPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={newItem.unitPrice}
                            onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {plans.map((plan) => {
                          const basePrice = calculatePriceFromPlan(
                            selectedInventoryItem.costPrice ?? 0,
                            plan.percentage,
                            plan.rounding,
                          );
                          const ivaAmount = basePrice * (taxRate / 100);
                          const totalPrice = basePrice + ivaAmount;
                          const active = plan.id === selectedProfitPlanId;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => {
                                setSelectedProfitPlanId(plan.id);
                                setNewItem({
                                  ...newItem,
                                  description: selectedInventoryItem.description?.trim() || selectedInventoryItem.name,
                                  unitPrice: basePrice,
                                  type: "part",
                                });
                              }}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                active ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/50"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="font-medium">{plan.name}</p>
                                <p className="text-xs text-muted-foreground">{plan.percentage}%</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">${totalPrice.toFixed(2)}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  Base ${basePrice.toFixed(2)} + IVA ${ivaAmount.toFixed(2)}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowProfitPlans(false)}>
                          Cerrar
                        </Button>
                        <Button type="button" size="sm" onClick={handleAddSelectedInventoryItem}>
                          Añadir ítem
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : itemMode === "services" ? (
              <div className="space-y-2">
                <Label>Servicios disponibles</Label>
                <div className="relative">
                  <Search01Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Buscar servicio por nombre o descripción"
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-2xl border bg-muted/20">
                  {visibleServices.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No hay servicios activos que coincidan con la búsqueda.
                    </p>
                  ) : (
                    visibleServices.map((service) => (
                      <button
                        key={service._id}
                        type="button"
                        onClick={() => handleAddServiceItem(service)}
                        className="flex w-full items-start justify-between gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{service.name}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {service.description || "Sin descripción"} · {service.billingType === "unit" ? "Por unidad" : "Por hora"}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold">${service.salePrice.toFixed(2)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Costo ${service.costPrice.toFixed(2)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {itemMode === "manual" && (
              <>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input 
                    autoFocus
                    placeholder={newItem.type === "service" ? "Ej. Cambio de bujías" : "Ej. Filtro de aceite"}
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Unitario ($)</Label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({...newItem, unitPrice: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg flex justify-between items-center mt-2">
                  <span className="font-medium text-muted-foreground">Total línea</span>
                  <span className="text-xl font-bold">${((Number(newItem.quantity) || 0) * (Number(newItem.unitPrice) || 0)).toFixed(2)}</span>
                </div>
              </>
            )}

          </DrawerPanel>
          
          <DrawerFooter className="flex-col items-stretch gap-3">
            <div className="flex items-center justify-end gap-2 pt-1">
              <DrawerClose render={<Button type="button" variant="ghost" />}>
                Cancelar
              </DrawerClose>
            {itemMode === "inventory" ? (
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            ) : (
              <Button type="submit">{itemToEdit ? "Actualizar Item" : "Guardar Item"}</Button>
            )}
            </div>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
