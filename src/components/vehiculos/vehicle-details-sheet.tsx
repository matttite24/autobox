"use client";

import { VehicleDoc } from "./vehiculo-form";
import {
  Drawer,
  DrawerPopup,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Car01Icon, Calendar01Icon, PaintBoardIcon, Tag01Icon, DocumentCodeIcon, UserCircleIcon, Task01Icon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { ClientDoc } from "../clientes/cliente-form";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useOrg } from "@/components/providers/org-provider";

interface VehicleDetailsSheetProps {
  vehicle: VehicleDoc | null;
  client?: ClientDoc | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleDetailsSheet({ vehicle, client, open, onOpenChange }: VehicleDetailsSheetProps) {
  const { orgId } = useOrg();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const router = useRouter();

  const orders = useQuery(
    api.work_orders.getByVehicle,
    vehicle && orgId ? { orgId, vehicleId: vehicle._id } : "skip"
  );

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Drawer position="right" open={open} onOpenChange={onOpenChange}>
      <DrawerPopup variant="inset" className="max-w-md w-full h-full flex flex-col bg-background rounded-l-2xl border-l">
        {vehicle && (
          <>
            <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Car01Icon className="size-6 text-primary" />
                </div>
                <div>
                  <DrawerTitle className="text-xl">
                    {vehicle.make} {vehicle.model}
                  </DrawerTitle>
                  <DrawerDescription>
                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border text-xs uppercase">
                      {vehicle.plate}
                    </span>
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-8">
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Información del Vehículo</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-16">Placa</span>
                      <span className="font-medium font-mono uppercase">{vehicle.plate}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      onClick={() => copyToClipboard(vehicle.plate, "plate")}
                    >
                      {copiedField === "plate" ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
                    </Button>
                  </div>
                  
                  {vehicle.vin && (
                    <div className="flex items-center justify-between text-sm group">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-16">VIN</span>
                        <span className="font-mono uppercase">{vehicle.vin}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon-sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={() => copyToClipboard(vehicle.vin || "", "vin")}
                      >
                        {copiedField === "vin" ? <CheckIcon className="size-3.5 text-green-500" /> : <CopyIcon className="size-3.5" />}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-16">Año</span>
                    <span>{vehicle.year}</span>
                  </div>

                  {vehicle.color && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground w-16">Color</span>
                      <span className="capitalize">{vehicle.color}</span>
                    </div>
                  )}

                  {vehicle.mileage !== undefined && (
                    <div className="flex items-center justify-between p-3 mt-4 bg-muted/40 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Car01Icon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground font-medium">Kilometraje Actual</span>
                          <span className="text-sm font-semibold font-mono">{vehicle.mileage.toLocaleString()} km</span>
                        </div>
                      </div>
                      
                      {vehicle.nextMileage !== undefined && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-amber-600/80 dark:text-amber-500/80 font-medium">Próximo Cambio</span>
                          <span className="text-sm font-semibold font-mono text-amber-600 dark:text-amber-500">{vehicle.nextMileage.toLocaleString()} km</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {client && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Propietario</h3>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <UserCircleIcon className="size-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{client.name}</span>
                      {client.phone && <span className="text-xs text-muted-foreground">{client.phone}</span>}
                    </div>
                  </div>
                </div>
              )}

              {vehicle.notes && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Notas</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {vehicle.notes}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Órdenes de Trabajo</h3>
                {!orders ? (
                  <div className="text-sm text-muted-foreground flex items-center justify-center py-4 border rounded-lg bg-muted/20">
                    Cargando órdenes...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-sm text-muted-foreground flex flex-col items-center justify-center py-6 border border-dashed rounded-lg bg-muted/20">
                    <Task01Icon className="size-8 text-muted-foreground/30 mb-2" />
                    <span>No hay órdenes para este vehículo</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {orders.map((order) => (
                      <div 
                        key={order._id}
                        onClick={() => router.push(`/ordenes?orderId=${order._id}`)}
                        className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Task01Icon className="size-4 text-primary" />
                            <span className="font-medium text-sm">
                              ODT-{order.number?.toString().padStart(4, "0")}
                            </span>
                          </div>
                          <Badge variant={order.status === "Completada" || order.status === "Entregado" ? "default" : "secondary"}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate flex-1 pr-4">{order.symptoms || "Sin descripción"}</span>
                          <span className="shrink-0 capitalize">{format(order.createdAt, "MMM d, yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          </>
        )}
      </DrawerPopup>
    </Drawer>
  );
}
