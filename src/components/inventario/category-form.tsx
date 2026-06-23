"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { useOrg } from "@/components/providers/org-provider";
import React from "react";

export type CategoryDoc = {
  _id: Id<"categories">;
  orgId: Id<"organizations">;
  name: string;
  parentId?: Id<"categories">;
};

export function CategoryForm({ 
  category, 
  parentId,
  trigger 
}: { 
  category?: CategoryDoc, 
  parentId?: Id<"categories">,
  trigger?: React.ReactNode 
}) {
  const { orgId } = useOrg();
  const isEditing = !!category;
  
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);
  const allCategories = useQuery(api.categories.list, orgId ? { orgId } : "skip");
  const categoryItems = useQuery(
    api.inventory.get,
    category && orgId
      ? {
          orgId,
          categoryId: category._id,
          searchTerm: "",
        }
      : "skip",
  );
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || "");
  const [selectedParentId, setSelectedParentId] = useState<Id<"categories"> | "">((category?.parentId || parentId) || "");
  const isSubcategory = !!category?.parentId || !!parentId;

  const getDeleteErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("No puedes eliminar una categoría en uso por el inventario")) {
      return "No puedes eliminarla porque tiene productos asociados.";
    }

    if (message.includes("Category not found")) {
      return "La categoría ya no existe.";
    }

    return message || "No se pudo eliminar la categoría.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "El nombre es obligatorio." });
    }

    try {
      if (isEditing) {
        await updateCategory({ 
          id: category._id, 
          name, 
          parentId: selectedParentId === "" ? undefined : (selectedParentId as Id<"categories">) 
        });
        toastManager.add({ type: "success", title: "Actualizado", description: "La categoría ha sido modificada." });
      } else {
        if (!orgId) throw new Error("No organization selected");
        await createCategory({ 
          orgId, 
          name, 
          parentId: selectedParentId === "" ? undefined : (selectedParentId as Id<"categories">) 
        });
        toastManager.add({ type: "success", title: "Creada", description: "La categoría ha sido registrada." });
        setName("");
      }
      setOpen(false);
    } catch {
      toastManager.add({ type: "error", title: "Error", description: `No se pudo ${isEditing ? "actualizar" : "crear"} la categoría.` });
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    if ((categoryItems?.length ?? 0) > 0) {
      toastManager.add({
        type: "error",
        title: "No se puede eliminar",
        description: "Esta categoría tiene productos asociados.",
      });
      return;
    }
    try {
      await removeCategory({ id: category._id });
      toastManager.add({ type: "success", title: "Eliminada", description: "La categoría fue eliminada." });
      setOpen(false);
    } catch (error) {
      const message = getDeleteErrorMessage(error);
      toastManager.add({ type: "error", title: "Error", description: message });
    }
  };

  // Filter out the current category and its children to prevent cyclic dependencies if editing
  const availableParents = (allCategories || []).filter(c => {
    if (isEditing && c._id === category._id) return false;
    if (isEditing && c.parentId) return false;
    if (isSubcategory && c.parentId) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        React.isValidElement(trigger)
          ? React.cloneElement(trigger as React.ReactElement<any>, {
              onClick: (e: React.MouseEvent) => {
                (trigger as React.ReactElement<any>).props?.onClick?.(e);
                if (!e.defaultPrevented) {
                  setTimeout(() => setOpen(true), 0);
                }
              },
            })
          : trigger
      ) : (
        <DialogTrigger nativeButton render={<Button variant="outline" size="sm">Nueva Categoría</Button>} />
      )}
      <DialogPopup className="max-w-md w-full bg-background rounded-xl border shadow-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{isEditing ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica el nombre o padre de esta categoría." : "Agrega una nueva clasificación a tu inventario."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Nombre de Categoría *</Label>
              <Input 
                id="catName" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="Ej: Aceites, Filtros, Herramientas..."
                autoFocus
              />
            </div>
            
            {!isSubcategory && (
              <div className="space-y-2">
                <Label htmlFor="parentCat">Categoría Padre (Opcional)</Label>
                <select 
                  id="parentCat"
                  value={selectedParentId}
                  onChange={e => setSelectedParentId(e.target.value as Id<"categories"> | "")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">(Ninguna - Categoría Principal)</option>
                  {availableParents.filter(c => !c.parentId).map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Si seleccionas un padre, esta será una subcategoría.
                </p>
              </div>
            )}
            {isSubcategory && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Esta categoría ya es una subcategoría. No puede tener otra subcategoría debajo.
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t flex items-center justify-end gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={(categoryItems?.length ?? 0) > 0}
              >
                Eliminar
              </Button>
            )}
            {isEditing && (categoryItems?.length ?? 0) > 0 && (
              <span className="mr-auto text-xs text-muted-foreground">
                Tiene productos asociados
              </span>
            )}
            <DialogClose render={<Button type="button" variant="ghost">Cancelar</Button>} />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {isEditing ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
