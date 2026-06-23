"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryForm, CategoryDoc } from "./category-form";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPanel,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  FolderOpenIcon,
  PencilEdit01Icon,
  Tag01Icon,
  PackageIcon,
  Alert01Icon,
  Task01Icon,
  Clock01Icon,
  ContactBookIcon,
  UserCircleIcon,
} from "hugeicons-react";
import { Id } from "@convex/_generated/dataModel";
import type { Doc } from "@convex/_generated/dataModel";

const SMART_FILTERS = [
  {
    id: "filter:sin-stock",
    label: "Sin Stock",
    icon: Alert01Icon,
    color: "text-red-500",
    activeBg: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  {
    id: "filter:bajo-stock",
    label: "Bajo Stock",
    icon: Task01Icon,
    color: "text-amber-500",
    activeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  {
    id: "filter:sin-proveedor",
    label: "Sin proveedor",
    icon: UserCircleIcon,
    color: "text-purple-500",
    activeBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  {
    id: "filter:nuevos",
    label: "Recientes",
    icon: Clock01Icon,
    color: "text-sky-500",
    activeBg: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  },
] as const;

type Supplier = Pick<Doc<"clients">, "_id" | "name">;

export function CategorySidebar({
  selectedCategoryId,
  supplierFilter,
  suppliers,
  categories,
  onSelectCategory,
  onSelectSupplier,
}: {
  selectedCategoryId: string;
  supplierFilter: Id<"clients"> | "all";
  suppliers: Supplier[];
  categories: CategoryDoc[];
  onSelectCategory: (id: string) => void;
  onSelectSupplier: (id: Id<"clients"> | "all") => void;
}) {
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");

  const selectedSupplier = suppliers.find((s) => s._id === supplierFilter);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  return (
    <>
      {/* ── Drawer de selección de proveedor ── */}
      <Drawer position="right" open={supplierDrawerOpen} onOpenChange={setSupplierDrawerOpen}>
        <DrawerPopup variant="inset" className="w-80 h-full flex flex-col bg-background rounded-l-2xl border-l">
          <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
            <DrawerTitle>Filtrar por proveedor</DrawerTitle>
            <DrawerDescription>Selecciona un proveedor para ver sus productos.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
             <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar proveedor..."
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             </div>
          </div>
          
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-0.5">
            <button
              onClick={() => { onSelectSupplier("all"); setSupplierDrawerOpen(false); }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full text-left transition-colors",
                supplierFilter === "all"
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <PackageIcon className="size-4 shrink-0" />
              Todos los proveedores
            </button>
            {filteredSuppliers.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {suppliers.length === 0 ? "No hay proveedores registrados." : "No se encontraron proveedores."}
              </p>
            )}
            {filteredSuppliers.map((s) => (
              <button
                key={s._id}
                onClick={() => { onSelectSupplier(s._id as Id<"clients">); setSupplierDrawerOpen(false); }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full text-left transition-colors",
                  supplierFilter === s._id
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <ContactBookIcon className="size-4 shrink-0" />
                {s.name}
              </button>
            ))}
          </div>

          <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
            <DrawerClose render={<Button variant="outline" className="w-full" />}>
              Cerrar
            </DrawerClose>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>


      {/* ── Sidebar ── */}
      <div className="hidden md:flex h-full w-56 shrink-0">
        <div className="flex h-full w-full flex-col gap-5 p-0">

          {/* Filtros rápidos */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Filtros
            </h2>
            <div className="flex flex-col gap-0.5">
              {SMART_FILTERS.map((filter) => {
                const Icon = filter.icon;
                const isActive = selectedCategoryId === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => onSelectCategory(isActive ? "all" : filter.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors w-full",
                      isActive
                        ? filter.activeBg + " font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isActive ? "" : filter.color)} />
                    <span className="truncate leading-none">{filter.label}</span>
                  </button>
                );
              })}

              {/* Por Proveedor */}
              <button
                onClick={() => setSupplierDrawerOpen(true)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors w-full",
                  supplierFilter !== "all"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <ContactBookIcon className={cn("size-4 shrink-0", supplierFilter !== "all" ? "" : "text-indigo-500")} />
                <span className="flex-1 truncate leading-none">
                  {supplierFilter !== "all" && selectedSupplier
                    ? selectedSupplier.name
                    : "Por Proveedor"}
                </span>
                {supplierFilter !== "all" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectSupplier("all"); }}
                    className="ml-auto text-xs leading-none hover:text-destructive transition-colors"
                    aria-label="Quitar filtro"
                  >
                    ✕
                  </button>
                )}
              </button>
            </div>
          </div>

          {/* Categorías */}
          <CategoriesList
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </div>
    </>
  );
}

// Subcomponente que renderiza el árbol de categorías
function CategoriesList({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: {
  categories: CategoryDoc[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}) {
  const rootCategories = categories.filter((c) => !c.parentId);
  const childrenMap = new Map<string, CategoryDoc[]>();
  categories.forEach((c) => {
    if (c.parentId) {
      if (!childrenMap.has(c.parentId)) childrenMap.set(c.parentId, []);
      childrenMap.get(c.parentId)!.push(c);
    }
  });

  const renderNode = (category: CategoryDoc, level = 0): React.ReactNode => {
    const isSelected = selectedCategoryId === category._id;
    const hasChildren = childrenMap.has(category._id) && childrenMap.get(category._id)!.length > 0;

    return (
      <div key={category._id} className="flex flex-col w-full">
        <div
          className={cn(
            "group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
            isSelected
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => { e.stopPropagation(); onSelectCategory(category._id); }}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {hasChildren ? <FolderOpenIcon className="size-4 text-blue-500" /> : <Tag01Icon className="size-3.5 opacity-50 ml-0.5" />}
            <span className="truncate">{category.name}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <CategoryForm
              category={category}
              trigger={
                <Button type="button" variant="ghost" size="icon-sm" className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                  <PencilEdit01Icon className="size-3.5" />
                </Button>
              }
            />
          </div>
        </div>
        {hasChildren && (
          <div className="flex flex-col mt-0.5">
            {childrenMap.get(category._id)!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Categorías</h2>
        <CategoryForm trigger={<Button variant="outline" size="sm">+ Crear</Button>} />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 -mr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-sm w-full text-left",
            selectedCategoryId === "all"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-medium"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onSelectCategory("all")}
        >
          <div className="p-0.5 ml-1"><PackageIcon className="size-4" /></div>
          <span>Todos</span>
        </button>
        {rootCategories.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">No hay categorías.</div>
        ) : (
          rootCategories.map((cat) => renderNode(cat, 0))
        )}
      </div>
    </div>
  );
}
