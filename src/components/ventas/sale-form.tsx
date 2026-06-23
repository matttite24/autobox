"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface SaleFormProps {
  trigger?: React.ReactElement;
  onSaleCreated?: (saleId: Id<"sales">) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaleForm({ trigger, onSaleCreated, open: openProp, onOpenChange }: SaleFormProps) {
  const { orgId } = useOrg();
  const createSale = useMutation(api.sales.create);
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createdAtLabel = format(new Date(), "dd/MM/yyyy");
  
  // Para la búsqueda de clientes (simplificado para POS)
  const [clientSearch, setClientSearch] = useState("Consumidor Final");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  const clients = useQuery(api.clients.get, orgId ? { orgId } : "skip");

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.documentId?.includes(clientSearch)
  ).slice(0, 10) || [];

  const selectedClient = clients?.find(c => c._id === selectedClientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    
    if (!clientSearch.trim()) {
      return toastManager.add({ type: "error", title: "Error", description: "Ingresa el nombre del cliente." });
    }

    setIsSubmitting(true);
    try {
      const saleId = await createSale({
        orgId,
        clientId: selectedClientId as Id<"clients">,
        clientName: clientSearch,
      });
      toastManager.add({ type: "success", title: "Venta creada", description: "Se ha iniciado una nueva venta." });
      setOpen(false);
      setClientSearch("Consumidor Final");
      setSelectedClientId(undefined);
      
      if (onSaleCreated) {
        onSaleCreated(saleId);
      }
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo crear la venta." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setClientSearch("Consumidor Final");
      setSelectedClientId(undefined);
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={handleOpenChange}>
      {openProp === undefined && (
        <DrawerTrigger render={trigger ?? (
          <Button>
            <PlusSignIcon className="size-4 mr-2" /> Nueva Venta
          </Button>
        )} />
      )}
      <DrawerPopup variant="inset">
        <DrawerHeader>
          <DrawerTitle>Nueva Venta POS</DrawerTitle>
          <DrawerDescription>
            Inicia una nueva venta de repuestos o servicios.
          </DrawerDescription>
          <p className="text-xs text-muted-foreground">
            Fecha de creación: {createdAtLabel}
          </p>
        </DrawerHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DrawerPanel className="grid gap-6 content-start">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="client">Cliente</Label>
                {selectedClient ? (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-left transition-all"
                    onClick={() => { 
                      setSelectedClientId(undefined); 
                      setClientSearch(""); 
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {selectedClient.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{selectedClient.name}</p>
                      {selectedClient.documentId && <p className="text-xs text-muted-foreground">RUC/CI: {selectedClient.documentId}</p>}
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
                        id="client"
                        placeholder="Buscar cliente por nombre o RUC..." 
                        className="pl-9"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
                      {filteredClients.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setClientSearch(c.name);
                              setSelectedClientId(c._id);
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

                        {filteredClients.length === 0 && clientSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              // El usuario quiere continuar como cliente libre
                              // no seteamos ID, solo el nombre buscado
                              setSelectedClientId(undefined);
                            }}
                            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-muted/40 px-4 py-3 text-left transition-all"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold">
                              <PlusSignIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">Vender a: &quot;{clientSearch}&quot;</p>
                              <p className="text-xs text-muted-foreground">Cliente sin registrar (Consumidor Final)</p>
                            </div>
                          </button>
                        )}
                      </div>

                    {clientSearch === "" && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearch("Consumidor Final");
                          setSelectedClientId(undefined);
                        }}
                        className="w-full flex items-center gap-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 px-4 py-3 text-left transition-all"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                          CF
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">Consumidor Final</p>
                          <p className="text-xs text-muted-foreground">Venta rápida sin datos fiscales</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DrawerPanel>
          <DrawerFooter className="border-t shrink-0 flex-row justify-end gap-2">
            <DrawerClose render={<Button type="button" variant="ghost">Cancelar</Button>} />
            <Button type="submit" disabled={isSubmitting}>
              Continuar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
