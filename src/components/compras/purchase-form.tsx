"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusSignIcon, Search01Icon } from "hugeicons-react";
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

interface PurchaseFormProps {
  trigger?: React.ReactElement;
  onPurchaseCreated?: (purchaseId: Id<"purchases">) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PurchaseForm({ trigger, onPurchaseCreated, open: openProp, onOpenChange }: PurchaseFormProps) {
  const { orgId } = useOrg();
  const createPurchase = useMutation(api.purchases.create);
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Buscar proveedores
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  
  // Manejo de fechas usando YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const issueDateValue = new Date(`${issueDate}T00:00:00`);
  const dueDateValue = dueDate ? new Date(`${dueDate}T00:00:00`) : undefined;

  const clients = useQuery(api.clients.get, orgId ? { orgId, type: "Proveedor" } : "skip");

  const filteredSuppliers = clients?.filter(c => 
    c.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    c.documentId?.includes(supplierSearch)
  ).slice(0, 10) || [];

  const selectedSupplier = clients?.find(c => c._id === selectedSupplierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    
    if (!selectedSupplierId) {
      return toastManager.add({ type: "error", title: "Error", description: "Debes seleccionar un proveedor." });
    }

    setIsSubmitting(true);
    try {
      // Las compras inicialmente no tienen ítems hasta que se añadan en el drawer
      const purchaseId = await createPurchase({
        orgId,
        number: invoiceNumber || undefined,
        supplierId: selectedSupplierId as Id<"clients">,
        supplierName: selectedSupplier?.name || "Desconocido",
        issueDate: new Date(issueDate).getTime(),
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        items: [],
      });
      
      toastManager.add({ type: "success", title: "Borrador creado", description: "La compra quedó lista para agregar ítems." });
      setOpen(false);
      
      // Reset form
      setSupplierSearch("");
      setSelectedSupplierId(undefined);
      setInvoiceNumber("");
      setIssueDate(today);
      setDueDate("");
      
      if (onPurchaseCreated) {
        onPurchaseCreated(purchaseId);
      }
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo crear la compra." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSupplierSearch("");
      setSelectedSupplierId(undefined);
      setInvoiceNumber("");
      setIssueDate(today);
      setDueDate("");
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={handleOpenChange}>
      {openProp === undefined && (
        <DrawerTrigger render={trigger ?? (
          <Button>
            <PlusSignIcon className="size-4 mr-2" /> Nueva Compra
          </Button>
        )} />
      )}
      <DrawerPopup variant="inset" className="max-w-2xl w-full">
        <DrawerHeader>
          <DrawerTitle>Nueva Factura de Compra</DrawerTitle>
          <DrawerDescription>
            Registra una nueva compra a un proveedor.
          </DrawerDescription>
        </DrawerHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DrawerPanel className="grid gap-6 content-start">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="supplier">Proveedor</Label>
                {selectedSupplier ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-left transition-all"
                    onClick={() => { 
                      setSelectedSupplierId(undefined); 
                      setSupplierSearch(""); 
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {selectedSupplier.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedSupplier.name}</p>
                      {selectedSupplier.documentId && <p className="text-xs text-muted-foreground">RUC: {selectedSupplier.documentId}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">Clic para cambiar</span>
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search01Icon className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="supplier"
                        placeholder="Buscar proveedor..." 
                        className="pl-9"
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
                      {filteredSuppliers.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setSupplierSearch(c.name);
                              setSelectedSupplierId(c._id);
                            }}
                            className="w-full flex items-center gap-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 px-4 py-2.5 text-left transition-all"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                              {c.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{c.name}</p>
                              {c.documentId && <p className="text-xs text-muted-foreground">RUC/CI: {c.documentId}</p>}
                            </div>
                          </button>
                        ))}
                        {filteredSuppliers.length === 0 && supplierSearch && (
                           <div className="text-center p-4 border border-dashed rounded-lg">
                             <p className="text-sm text-muted-foreground">No se encontró al proveedor.</p>
                             <p className="text-xs text-muted-foreground mt-1">Crea el proveedor en la sección Personas.</p>
                           </div>
                        )}
                      </div>
                  </div>
                )}
              </div>

              {selectedSupplierId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Nº de Factura (Opcional)</Label>
                    <Input 
                      id="invoiceNumber"
                      placeholder="Ej. 001-001-000123456" 
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Fecha de Emisión</Label>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              id="issueDate"
                              type="button"
                              variant="outline"
                              className="w-full justify-start"
                            >
                              <span>{format(issueDateValue, "dd/MM/yyyy")}</span>
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-2">
                          <Calendar
                            mode="single"
                            selected={issueDateValue}
                            onSelect={(date) => {
                              if (!date) return;
                              setIssueDate(format(date, "yyyy-MM-dd"));
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Vencimiento (Crédito)</Label>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              id="dueDate"
                              type="button"
                              variant="outline"
                              className="w-full justify-start"
                            >
                              <span>{dueDateValue ? format(dueDateValue, "dd/MM/yyyy") : "Seleccionar fecha"}</span>
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-2">
                          <Calendar
                            mode="single"
                            selected={dueDateValue}
                            onSelect={(date) => {
                              setDueDate(date ? format(date, "yyyy-MM-dd") : "");
                            }}
                            disabled={{ before: issueDateValue }}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex gap-2 mt-2">
                        {[30, 60, 90].map(days => (
                          <Button
                            key={days}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-[10px] px-2 flex-1"
                            onClick={() => {
                              const d = new Date(issueDateValue);
                              d.setDate(d.getDate() + days);
                              setDueDate(format(d, "yyyy-MM-dd"));
                            }}
                          >
                            {days} días
                          </Button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Dejar vacío si es pago al contado.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DrawerPanel>
          <DrawerFooter className="border-t shrink-0 flex-row justify-end gap-2">
            <DrawerClose render={<Button type="button" variant="ghost">Cancelar</Button>} />
            <Button type="submit" disabled={isSubmitting || !selectedSupplierId}>
              Continuar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
