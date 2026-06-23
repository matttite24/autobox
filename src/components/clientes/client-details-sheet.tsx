"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ClienteForm, ClientDoc } from "./cliente-form";
import { useOrg } from "@/components/providers/org-provider";
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { UserCircleIcon, Car01Icon, Mail01Icon, CallIcon, Building04Icon, PencilEdit01Icon } from "hugeicons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ClientDetailsSheetProps {
  client: ClientDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsSheet({ client, open, onOpenChange }: ClientDetailsSheetProps) {
  const { orgId } = useOrg();
  
  // Solo consultamos los vehículos si el Sheet está abierto y hay un cliente
  const vehicles = useQuery(
    api.vehicles.getByClient,
    (open && client && orgId) ? { orgId, clientId: client._id } : "skip"
  );

  return (
    <Drawer position="right" open={open} onOpenChange={onOpenChange}>
      <DrawerPopup variant="inset" className="max-w-md w-full h-full flex flex-col bg-background rounded-l-2xl border-l">
        {client && (
          <>
            <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCircleIcon className="size-6 text-primary" />
                </div>
                <div>
                  <DrawerTitle className="text-xl">{client.name}</DrawerTitle>
                  <DrawerDescription>Perfil de persona</DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-8">
              
              {/* Información de Contacto */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Información</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-16">Tipo</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {client.type || "Cliente"}
                    </span>
                  </div>
                  {client.documentId && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground w-16">RUC/CI</span>
                      <span className="font-medium">{client.documentId}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Mail01Icon className="size-4 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <CallIcon className="size-4 text-muted-foreground" />
                      <span className="flex-1">{client.phone}</span>
                      <a
                        href={`https://wa.me/${client.phone.replace(/\D/g, "").replace(/^0/, "593")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Escribir por WhatsApp"
                        className="text-emerald-500 hover:text-emerald-600 transition-colors shrink-0"
                      >
                        <svg viewBox="0 0 24 24" className="size-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    </div>
                  )}
                  {client.company && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building04Icon className="size-4 text-muted-foreground" />
                      <span>{client.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehículos Asociados */}
              {(client.type || "Cliente") === "Cliente" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Car01Icon className="size-5 text-primary" />
                    Vehículos Asociados
                  </h3>
                  <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {vehicles?.length || 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {vehicles === undefined ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-lg" />
                      <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
                      <Car01Icon className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Este cliente aún no tiene vehículos registrados.</p>
                    </div>
                  ) : (
                    vehicles.map((v) => (
                      <div key={v._id} className="p-3 rounded-lg border bg-card flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{v.make} {v.model} {v.year ? `· ${v.year}` : ""}</span>
                          <span className="font-mono text-xs border bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {v.plate}
                          </span>
                        </div>
                        {(v.color || v.vin) && (
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                            {v.color && <span>Color: {v.color}</span>}
                            {v.vin && <span className="font-mono uppercase">VIN: {v.vin}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}
              
            </div>
            
            <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
              <ClienteForm
                client={client}
                fixedType={client.type || "Cliente"}
                trigger={
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <PencilEdit01Icon className="size-4" />
                    Editar Perfil
                  </Button>
                }
              />
            </DrawerFooter>
          </>
        )}
      </DrawerPopup>
    </Drawer>
  );
}
