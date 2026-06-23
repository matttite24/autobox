"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { type Doc, type Id } from "@convex/_generated/dataModel";
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
import { Search01Icon, Settings01Icon, PencilEdit01Icon } from "hugeicons-react";

type PurchaseDoc = Doc<"purchases">;
type PurchaseItem = NonNullable<PurchaseDoc["items"]>[number];
type InventoryDoc = Doc<"inventory">;

interface PurchaseAddItemDrawerProps {
  purchase: PurchaseDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: PurchaseItem | null;
}

export function PurchaseAddItemDrawer({ purchase, open, onOpenChange, itemToEdit }: PurchaseAddItemDrawerProps) {
  const updateItems = useMutation(api.purchases.updateItems);
  const createInventoryItem = useMutation(api.inventory.create);

  const [itemMode, setItemMode] = useState<"inventory" | "manual">("inventory");
  const [inventorySearch, setInventorySearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [newItem, setNewItem] = useState({
    inventoryId: undefined as string | undefined,
    description: "",
    quantity: 1 as number | string,
    unitCost: 0 as number | string,
  });
  const [productForm, setProductForm] = useState({
    sku: "",
    code: "",
    categoryId: "" as string,
    salePrice: 0 as number | string,
    minQuantity: 0 as number | string,
    supplier: purchase.supplierName || "",
    location: "",
    details: "",
    status: "Activo" as "Activo" | "Inactivo",
  });

  const inventory = useQuery(
    api.inventory.get,
    purchase.orgId ? { orgId: purchase.orgId } : "skip",
  );
  const categories = useQuery(
    api.categories.list,
    purchase.orgId ? { orgId: purchase.orgId } : "skip",
  );

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        // Sync drawer form from the selected purchase item when opening.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItemMode(itemToEdit.inventoryId ? "inventory" : "manual");
        setInventorySearch(itemToEdit.description);
        setDebouncedSearch(itemToEdit.description);
        setNewItem({
          inventoryId: itemToEdit.inventoryId,
          description: itemToEdit.description,
          quantity: itemToEdit.quantity,
          unitCost: itemToEdit.unitCost,
        });
        setProductForm((current) => ({
          ...current,
          supplier: purchase.supplierName || current.supplier,
        }));
      } else {
        setItemMode("inventory");
        setInventorySearch("");
        setDebouncedSearch("");
        setNewItem({ inventoryId: undefined, description: "", quantity: 1, unitCost: 0 });
        setProductForm({
          sku: "",
          code: "",
          categoryId: "",
          salePrice: 0,
          minQuantity: 0,
          supplier: purchase.supplierName || "",
          location: "",
          details: "",
          status: "Activo",
        });
      }
    }
  }, [open, itemToEdit, purchase.supplierName]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(inventorySearch.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [inventorySearch]);

  const visibleInventory = (inventory || []).filter((item) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      (item.sku || item.code).toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term)
    );
  });

  const handleSelectInventoryItem = async (inventoryItem: InventoryDoc) => {
    const quantity = 1;
    const unitCost = inventoryItem.costPrice || 0;
    const currentItems = purchase.items || [];
    const existingItem = currentItems.find((item) => item.inventoryId === inventoryItem._id);

    const updatedItems = existingItem
      ? currentItems.map((item) => {
          if (item.id !== existingItem.id) return item;
          const nextQuantity = item.quantity + quantity;
          const nextUnitCost = unitCost || item.unitCost;
          return {
            ...item,
            quantity: nextQuantity,
            unitCost: nextUnitCost,
            total: nextQuantity * nextUnitCost,
          };
        })
      : [
          ...currentItems,
          {
            id: crypto.randomUUID(),
            inventoryId: inventoryItem._id,
            description: inventoryItem.name,
            quantity,
            unitCost,
            total: quantity * unitCost,
          },
        ];

    try {
      await updateItems({
        id: purchase._id,
        items: updatedItems,
      });

      setInventorySearch("");
      setDebouncedSearch("");
      toastManager.add({
        type: "success",
        title: existingItem ? "Cantidad actualizada" : "Producto añadido",
        description: existingItem
          ? "El producto ya estaba en la factura, se sumó 1 unidad."
          : "El producto fue añadido a la factura.",
      });
    } catch {
      toastManager.add({
        type: "error",
        title: "Error",
        description: "No se pudo añadir el producto.",
      });
    }
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItem.description.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "El nombre del producto es requerido." });
    }
    const quantityNum = Number(newItem.quantity) || 0;
    const unitCostNum = Number(newItem.unitCost) || 0;
    const salePriceNum = Number(productForm.salePrice) || 0;

    if (quantityNum <= 0) {
      return toastManager.add({ type: "error", title: "Error", description: "La cantidad debe ser mayor a 0." });
    }

    if (itemMode === "manual" && !newItem.inventoryId) {
      if (!productForm.sku.trim() || !productForm.code.trim() || !productForm.categoryId) {
        return toastManager.add({
          type: "error",
          title: "Faltan datos",
          description: "SKU, código y categoría son obligatorios para crear el producto.",
        });
      }

      if (salePriceNum <= 0) {
        return toastManager.add({
          type: "error",
          title: "Precio inválido",
          description: "El precio de venta debe ser mayor a 0.",
        });
      }
    }

    let inventoryId = newItem.inventoryId as Id<"inventory"> | undefined;

    try {
      if (itemMode === "manual" && !inventoryId) {
        inventoryId = await createInventoryItem({
          orgId: purchase.orgId,
          name: newItem.description.trim(),
          sku: productForm.sku.trim(),
          code: productForm.code.trim(),
          description: productForm.details.trim() || undefined,
          categoryId: productForm.categoryId as Id<"categories">,
          quantity: 0,
          minQuantity: Number(productForm.minQuantity) || 0,
          costPrice: unitCostNum,
          salePrice: salePriceNum,
          supplier: productForm.supplier.trim() || undefined,
          location: productForm.location.trim() || undefined,
          status: productForm.status,
        });
      }

      const item = {
        id: itemToEdit?.id || crypto.randomUUID(),
        inventoryId,
        description: newItem.description.trim(),
        quantity: quantityNum,
        unitCost: unitCostNum,
        total: quantityNum * unitCostNum,
      };

      const currentItems = purchase.items || [];
      const updatedItems = itemToEdit
        ? currentItems.map((i) => i.id === itemToEdit.id ? item : i)
        : [...currentItems, item];

      await updateItems({
        id: purchase._id,
        items: updatedItems,
      });
      
      toastManager.add({ 
        type: "success", 
        title: itemToEdit ? "Item actualizado" : "Item añadido", 
        description: "El registro se guardó como parte del borrador de compra." 
      });
      
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
          <DrawerPanel className="grid gap-6 content-start">
            <div className="rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Los cambios de este borrador no mueven stock hasta que la compra se cierre.
            </div>
            <div className="flex gap-3">
              <Button 
                type="button"
                variant={itemMode === "inventory" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setItemMode("inventory");
                  setNewItem({ inventoryId: undefined, description: "", quantity: 1, unitCost: 0 });
                }}
              >
                <Settings01Icon className="mr-2 h-4 w-4" /> Buscar Repuesto
              </Button>
              <Button 
                type="button"
                variant={itemMode === "manual" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setItemMode("manual");
                  if (!itemToEdit) setNewItem({ inventoryId: undefined, description: "", quantity: 1, unitCost: 0 });
                }}
              >
                <PencilEdit01Icon className="mr-2 h-4 w-4" /> Nuevo Producto
              </Button>
            </div>

            {itemMode === "inventory" ? (
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
                <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/20">
                  {visibleInventory.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No hay productos que coincidan.
                    </p>
                  ) : (
                    visibleInventory.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => handleSelectInventoryItem(item)}
                        className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {(item.sku || item.code)} · Stock {item.quantity}
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          Costo: ${item.costPrice?.toFixed(2) || '0.00'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input 
                      autoFocus
                      placeholder="Ej. Filtro de aceite"
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input 
                      placeholder="Ej. FLT-1002"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                      disabled={!!newItem.inventoryId}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Código interno *</Label>
                  <Input
                    placeholder="Ej. INT-0001"
                    value={productForm.code}
                    onChange={(e) => setProductForm({...productForm, code: e.target.value})}
                    disabled={!!newItem.inventoryId}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría *</Label>
                    <select
                      value={productForm.categoryId}
                      onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                      disabled={!!newItem.inventoryId}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Seleccionar...</option>
                      {(categories || []).map((category) => (
                        <option key={category._id} value={category._id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <select
                      value={productForm.status}
                      onChange={(e) => setProductForm({...productForm, status: e.target.value as "Activo" | "Inactivo"})}
                      disabled={!!newItem.inventoryId}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cantidad Comprada *</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Costo Unitario ($)</Label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={newItem.unitCost}
                      onChange={(e) => setNewItem({...newItem, unitCost: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio de Venta ($) *</Label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={productForm.salePrice}
                      onChange={(e) => setProductForm({...productForm, salePrice: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                      disabled={!!newItem.inventoryId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Mínimo</Label>
                    <Input 
                      type="number" 
                      min="0"
                      value={productForm.minQuantity}
                      onChange={(e) => setProductForm({...productForm, minQuantity: e.target.value === "" ? "" : parseFloat(e.target.value)})}
                      disabled={!!newItem.inventoryId}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input 
                      value={productForm.supplier}
                      onChange={(e) => setProductForm({...productForm, supplier: e.target.value})}
                      disabled={!!newItem.inventoryId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input 
                      placeholder="Ej. Estante A2"
                      value={productForm.location}
                      onChange={(e) => setProductForm({...productForm, location: e.target.value})}
                      disabled={!!newItem.inventoryId}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción adicional</Label>
                  <Input 
                    placeholder="Aplica para modelos, notas, marca..."
                    value={productForm.details}
                    onChange={(e) => setProductForm({...productForm, details: e.target.value})}
                    disabled={!!newItem.inventoryId}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg flex justify-between items-center mt-2">
                  <span className="font-medium text-muted-foreground">Costo Total Línea</span>
                  <span className="text-xl font-bold">${((Number(newItem.quantity) || 0) * (Number(newItem.unitCost) || 0)).toFixed(2)}</span>
                </div>
              </>
            )}
          </DrawerPanel>
          
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DrawerClose>
            {itemMode === "manual" && (
              <Button type="submit">{itemToEdit ? "Actualizar Item" : "Guardar Item"}</Button>
            )}
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
