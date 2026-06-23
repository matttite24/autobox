"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Upload01Icon, FileDownloadIcon, Cancel01Icon, CheckmarkCircle02Icon, AlertCircleIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";

// ─── CSV template ────────────────────────────────────────────────────────────
// El campo "proveedor" debe coincidir exactamente con el nombre de un Proveedor registrado en Personas.
// Si coincide, se vincula automáticamente; si no, se guarda solo como texto de referencia.
const CSV_TEMPLATE = `nombre,sku,descripcion,categoria,cantidad,cantidad_minima,precio_costo,precio_venta,proveedor,ubicacion,estado
Aceite Motor 5W30,ACE001,Aceite sintético para motor,Lubricantes,10,2,8.50,14.99,Distribuidora X,A1,Activo
Filtro de Aire,FIL001,Filtro de aire universal,Filtros,5,1,3.20,7.99,,B2,Activo`;

type ParsedRow = {
  line: number;
  valid: boolean;
  errors: string[];
  data: {
    name: string;
    sku?: string;
    description?: string;
    categoryName: string;
    quantity: number;
    minQuantity?: number;
    costPrice?: number;
    salePrice: number;
    supplier?: string;
    location?: string;
    status: "Activo" | "Inactivo";
  };
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";

  return lines.slice(1).map((line, i) => {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const errors: string[] = [];

    const name = cols[0] ?? "";
    const sku = cols[1] || undefined;
    const description = cols[2] || undefined;
    const categoryName = cols[3] ?? "";
    const quantity = parseFloat(cols[4] ?? "");
    const minQuantity = cols[5] ? parseFloat(cols[5]) : undefined;
    const costPrice = cols[6] ? parseFloat(cols[6]) : undefined;
    const salePrice = parseFloat(cols[7] ?? "");
    const supplier = cols[8] || undefined;
    const location = cols[9] || undefined;
    const status = (cols[10]?.trim() === "Inactivo" ? "Inactivo" : "Activo") as "Activo" | "Inactivo";

    if (!name) errors.push("Nombre requerido");
    if (!categoryName) errors.push("Categoría requerida");
    if (isNaN(quantity) || quantity < 0) errors.push("Cantidad inválida");
    if (isNaN(salePrice) || salePrice < 0) errors.push("Precio de venta inválido");

    return {
      line: i + 2,
      valid: errors.length === 0,
      errors,
      data: {
        name,
        sku,
        description,
        categoryName,
        quantity: isNaN(quantity) ? 0 : quantity,
        minQuantity: minQuantity && !isNaN(minQuantity) ? minQuantity : undefined,
        costPrice: costPrice && !isNaN(costPrice) ? costPrice : undefined,
        salePrice: isNaN(salePrice) ? 0 : salePrice,
        supplier,
        location,
        status,
      },
    };
  });
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_inventario.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportCSVDialog({ orgId }: { orgId: Id<"organizations"> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkCreate = useMutation(api.inventory.bulkCreate);

  const handleFile = (file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setRows(parseCSV(e.target?.result as string));
    reader.readAsText(file);
  };

  const reset = () => { setRows([]); setResult(null); };

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const handleImport = async () => {
    if (!validRows.length) return;
    setLoading(true);
    try {
      const res = await bulkCreate({ orgId, items: validRows.map((r) => r.data) });
      setResult(res);
      setRows([]);
    } catch (e: unknown) {
      toastManager.add({ type: "error", title: "Error al importar", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="shrink-0 gap-2">
          <Upload01Icon className="size-4" />
          <span className="hidden sm:inline">Importar CSV</span>
        </Button>
      } />

      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar productos desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo <code className="rounded bg-muted px-1 py-0.5 text-xs">.csv</code> para crear múltiples productos de una sola vez. Si el campo <strong>proveedor</strong> coincide con un Proveedor registrado en Personas, se vincula automáticamente.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {/* ── Resultado ── */}
          {result && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckmarkCircle02Icon className="size-7 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">¡Importación completada!</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{result.created}</span> productos creados.
                  {result.skipped > 0 && (
                    <> <span className="font-medium text-amber-500">{result.skipped}</span> omitidos por SKU duplicado.</>
                  )}
                </p>
              </div>
              <DialogClose render={<Button size="sm" />}>
                Cerrar
              </DialogClose>
            </div>
          )}

          {/* ── Drop zone ── */}
          {!result && rows.length === 0 && (
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file?.name.endsWith(".csv")) handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50">
                <Upload01Icon className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Arrastra tu archivo CSV aquí</p>
                <p className="mt-1 text-xs text-muted-foreground">o haz clic para seleccionarlo · solo .csv</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* ── Preview de filas ── */}
          {!result && rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{validRows.length}</span> válidos
                  {invalidRows.length > 0 && (
                    <> · <span className="font-medium text-destructive">{invalidRows.length}</span> con errores</>
                  )}
                </p>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={reset}>
                  <Cancel01Icon className="size-3.5" />
                  Cambiar archivo
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">SKU</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => (
                        <tr
                          key={row.line}
                          className={cn("transition-colors", !row.valid && "bg-destructive/5")}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row.line}</td>
                          <td className="max-w-[160px] truncate px-3 py-2 font-medium">
                            {row.data.name || <span className="text-destructive">—</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{row.data.sku ?? "—"}</td>
                          <td className="px-3 py-2">{row.data.categoryName || "—"}</td>
                          <td className="px-3 py-2 text-right">${row.data.salePrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center">
                            {row.valid ? (
                              <CheckmarkCircle02Icon className="mx-auto size-4 text-emerald-500" />
                            ) : (
                              <span className="text-destructive">{row.errors[0]}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>Las filas con errores se omitirán. Solo se importarán los <strong>{validRows.length}</strong> registros válidos.</p>
                </div>
              )}
            </div>
          )}
        </DialogPanel>

        {!result && (
          <DialogFooter variant="default">
            <Button variant="ghost" size="sm" className="mr-auto gap-2" onClick={downloadTemplate}>
              <FileDownloadIcon className="size-4" />
              Descargar plantilla
            </Button>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Cancelar
            </DialogClose>
            <Button
              size="sm"
              disabled={validRows.length === 0 || loading}
              onClick={handleImport}
            >
              {loading ? "Importando…" : rows.length === 0 ? "Importar" : `Importar ${validRows.length} productos`}
            </Button>
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}
