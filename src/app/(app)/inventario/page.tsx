"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { CategorySidebar } from "@/components/inventario/category-sidebar";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import {
  PackageIcon,
  Alert01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  PlusSignIcon,
  Tag01Icon,
  Refresh01Icon,
} from "hugeicons-react";
import { useOrg } from "@/components/providers/org-provider";
import { InventoryForm } from "@/components/inventario/inventory-form";
import { ImportCSVDialog } from "@/components/inventario/import-csv-dialog";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useDebounce } from "@/hooks/use-debounce";

export default function InventarioPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState<Id<"clients"> | "all">("all");
  const [selectedItem, setSelectedItem] = useState<{
    _id: Id<"inventory">;
    orgId: Id<"organizations">;
    name: string;
    sku?: string;
    code: string;
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
  } | null>(null);
  const [newFormOpen, setNewFormOpen] = useState(() => searchParams.get("new") === "1");

  const [shouldLoad, setShouldLoad] = useState(true);

  useEffect(() => {
    if (debouncedSearchTerm.trim() !== "") {
      setShouldLoad(true);
    }
  }, [debouncedSearchTerm]);

  const categories = useQuery(api.categories.list, orgId ? { orgId } : "skip");
  const suppliers = useQuery(api.clients.get, orgId ? { orgId, type: "Proveedor" } : "skip");

  const isSmartFilter = categoryFilter.startsWith("filter:");

  const items = useQuery(
    api.inventory.get,
    orgId && shouldLoad ? {
      orgId,
      categoryId: (!isSmartFilter && categoryFilter !== "all") ? (categoryFilter as Id<"categories">) : undefined,
      supplierId: supplierFilter !== "all" ? supplierFilter : undefined,
      searchTerm: debouncedSearchTerm,
    } : "skip"
  );

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const filteredItems = isSmartFilter && items
    ? items.filter((item) => {
        switch (categoryFilter) {
          case "filter:sin-stock":    return item.quantity === 0;
          case "filter:bajo-stock":  return item.quantity > 0 && !!item.minQuantity && item.quantity <= item.minQuantity;
          case "filter:inactivos":   return item.status === "Inactivo";
          case "filter:sin-costo":   return !item.costPrice || item.costPrice === 0;
          case "filter:sin-proveedor": return !item.supplier && (!item.supplierIds || item.supplierIds.length === 0);
          case "filter:nuevos":      return (now - item.createdAt) <= THIRTY_DAYS;
          default: return true;
        }
      })
    : items;

  const { page, setPage, totalPages, paginatedItems, total } = usePagination(filteredItems, 20);

  const supplierMap = new Map(suppliers?.map((s) => [s._id, s.name]) ?? []);

  const itemIdParam = searchParams.get("itemId") as Id<"inventory"> | null;
  const itemFromUrl = useQuery(api.inventory.getById, itemIdParam ? { id: itemIdParam } : "skip");

  useEffect(() => {
    const isNew = searchParams.get("new") === "1";
    if (isNew) {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/inventario", { scroll: false });
    }
  }, [searchParams, router]);

  useNewShortcut(() => setNewFormOpen(true));

  useEffect(() => {
    if (!itemFromUrl || selectedItem) return;
    queueMicrotask(() => setSelectedItem(itemFromUrl));
    router.replace("/inventario", { scroll: false });
  }, [itemFromUrl, selectedItem, router]);

  const removeItem = useMutation(api.inventory.remove);

  const handleDelete = async (id: Id<"inventory">) => {
    try {
      await removeItem({ id });
      toastManager.add({ type: "success", title: "Eliminado", description: "El artículo ha sido borrado del inventario." });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el artículo." });
    }
  };

  if (!orgId) return null;

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Almacén"
        mobileTitle="Almacén"
        toolbar={
          <SearchFilterBar
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar producto..."
            isActive={!!searchTerm.trim() || categoryFilter !== "all" || supplierFilter !== "all"}
            onClear={() => {
              setSearchTerm("");
              setCategoryFilter("all");
              setSupplierFilter("all");
              setShouldLoad(true);
            }}
          />
        }
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShouldLoad(true)}
          disabled={shouldLoad && items === undefined}
          title="Cargar / Actualizar Inventario"
          aria-label="Cargar / Actualizar Inventario"
        >
          <Refresh01Icon className={`size-4 ${shouldLoad && items === undefined ? "animate-spin" : ""}`} />
        </Button>
        <ImportCSVDialog orgId={orgId} />
        <Button size="sm" className="shrink-0 gap-2" onClick={() => setNewFormOpen(true)} aria-label="Nuevo producto">
          <PlusSignIcon className="size-4" />
          <span className="hidden sm:inline">Nuevo Producto</span>
        </Button>
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex w-full gap-4 min-h-0">
            <CategorySidebar
              selectedCategoryId={categoryFilter}
              supplierFilter={supplierFilter}
              suppliers={suppliers ?? []}
              categories={categories ?? []}
              onSelectCategory={(val) => {
                setCategoryFilter(val);
                setShouldLoad(true);
              }}
              onSelectSupplier={(val) => {
                setSupplierFilter(val);
                setShouldLoad(true);
              }}
            />

            <div className="flex-1 flex flex-col min-w-0 gap-3">
            <div className="rounded-md border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría / Proveedor</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!shouldLoad ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center text-muted-foreground">
                      <PackageIcon className="size-16 mx-auto mb-4 opacity-20" />
                      <h3 className="text-lg font-medium text-foreground">Almacén no cargado</h3>
                      <p className="mt-2 text-sm max-w-sm mx-auto mb-4">Presiona &quot;Cargar Datos&quot; o busca un producto específico para no sobrecargar la página.</p>
                      <Button onClick={() => setShouldLoad(true)} variant="secondary">
                        <Refresh01Icon className="size-4 mr-2" /> Cargar Inventario
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : items === undefined ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24 mt-2" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-md" /></TableCell>
                      <TableCell><div className="flex justify-end"><Skeleton className="h-4 w-20" /></div></TableCell>
                      <TableCell><div className="flex justify-center"><Skeleton className="h-6 w-12 rounded-full" /></div></TableCell>
                      <TableCell><div className="flex justify-center"><Skeleton className="h-5 w-16 rounded-md" /></div></TableCell>
                      <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <PackageIcon className="size-12 mx-auto mb-3 opacity-20" />
                      <p>No se encontraron artículos.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  (paginatedItems ?? []).map((item) => {
                    const isLowStock = item.minQuantity !== undefined && item.quantity <= item.minQuantity;

                    return (
                      <TableRow 
                        key={item._id}
                        onClick={() => setSelectedItem(item)}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-xs">{item.sku ?? item.code}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium w-fit">
                              <Tag01Icon className="size-3" />
                              {categories?.find(c => c._id === item.categoryId)?.name || "Sin categoría"}
                            </span>
                            {(item.supplierIds ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {(item.supplierIds ?? []).map((sid) => (
                                  <span
                                    key={sid}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-medium"
                                  >
                                    {supplierMap.get(sid) ?? "Proveedor eliminado"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${item.salePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                            isLowStock ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          }`}>
                            {isLowStock && <Alert01Icon className="size-3.5" />}
                            {item.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-1 rounded-md ${
                            item.status === "Activo" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <InventoryForm
                              item={item}
                              mode="edit"
                              trigger={
                                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <PencilEdit01Icon className="size-4" />
                                </Button>
                              }
                            />

                            <AlertDialog>
                              <AlertDialogTrigger render={
                                <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10">
                                  <Delete02Icon className="size-4" />
                                </Button>
                              } />
                              <AlertDialogPopup>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Estás a punto de eliminar <strong>{item.name}</strong> del inventario de forma permanente. Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogClose render={<Button variant="ghost">Cancelar</Button>} />
                                  <AlertDialogClose
                                    render={<Button variant="ghost" className="bg-destructive hover:bg-destructive/90 text-white">Sí, eliminar</Button>}
                                    onClick={() => handleDelete(item._id)}
                                  />
                                </AlertDialogFooter>
                              </AlertDialogPopup>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
            </div>
          </div>
        </div>
        <div className="border-t bg-background px-6 py-4 shrink-0">
          <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
        </div>
      </main>

      <InventoryForm
        item={selectedItem ?? undefined}
        mode="view"
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
      <InventoryForm open={newFormOpen} onOpenChange={setNewFormOpen} />
    </div>
  );
}
