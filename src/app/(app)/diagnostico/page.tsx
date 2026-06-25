"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RelationResult = {
  client: {
    _id: string;
    name: string;
    documentId?: string;
    email: string;
    phone?: string;
    company?: string;
    type?: string;
    roles?: string[];
  } | null;
  relatedOrders: Array<{ _id: string; number?: number; status: string; clientId: string }>;
  relatedSales: Array<{ _id: string; number?: number; status: string; clientName: string; clientId?: string }>;
  relatedPurchases: Array<{ _id: string; number?: string; status: string; supplierName: string; supplierId: string }>;
  relatedVehicles: Array<{ _id: string; plate: string; make: string; model: string; clientId: string }>;
} | null;

function Section({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children || <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
    </div>
  );
}

export default function DiagnosticoPage() {
  const { orgId } = useOrg();
  const [documentId, setDocumentId] = useState("");
  const [submittedDocumentId, setSubmittedDocumentId] = useState("");

  const result = useQuery(
    api.debug.clientRelations,
    orgId && submittedDocumentId ? { orgId, documentId: submittedDocumentId } : "skip",
  ) as RelationResult | undefined;

  const hasResult = result !== undefined;

  const clientLabel = useMemo(() => {
    if (!result?.client) return "";
    return `${result.client.name}${result.client.documentId ? ` · ${result.client.documentId}` : ""}`;
  }, [result]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Diagnóstico" mobileTitle="Diag." />

      <div className="flex flex-col gap-6 p-6">
        <Card className="max-w-2xl p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedDocumentId(documentId.trim());
            }}
          >
            <Input
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="Pega aquí el documentId del cliente"
            />
            <Button type="submit">Buscar</Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Busca el cliente y muestra órdenes, ventas, compras y vehículos vinculados.
          </p>
        </Card>

        {hasResult && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_1fr]">
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Cliente</h2>
              {result?.client ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xl font-semibold">{result.client.name}</p>
                    <p className="text-sm text-muted-foreground">{clientLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(result.client.roles && result.client.roles.length > 0 ? result.client.roles : [result.client.type || "Cliente"]).map((r: string) => (
                      <Badge key={r} variant="secondary">{r}</Badge>
                    ))}
                    {result.client.phone ? <Badge variant="secondary">{result.client.phone}</Badge> : null}
                    {result.client.email ? <Badge variant="secondary">{result.client.email}</Badge> : null}
                    {result.client.company ? <Badge variant="secondary">{result.client.company}</Badge> : null}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">No se encontró un cliente para ese valor.</p>
              )}
            </Card>

            <div className="grid gap-6">
              <Card className="p-5">
                <Section title="Órdenes" emptyLabel="Sin órdenes relacionadas.">
                  <div className="space-y-2">
                    {result?.relatedOrders.map((order) => (
                      <div key={order._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="font-medium">ORD-{order.number ?? "S/N"}</p>
                          <p className="text-xs text-muted-foreground">{order.status}</p>
                        </div>
                        <Badge variant="secondary">Orden</Badge>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>

              <Card className="p-5">
                <Section title="Ventas" emptyLabel="Sin ventas relacionadas.">
                  <div className="space-y-2">
                    {result?.relatedSales.map((sale) => (
                      <div key={sale._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="font-medium">Venta #{sale.number ?? "S/N"}</p>
                          <p className="text-xs text-muted-foreground">{sale.clientName} · {sale.status}</p>
                        </div>
                        <Badge variant="secondary">Venta</Badge>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>

              <Card className="p-5">
                <Section title="Compras" emptyLabel="Sin compras relacionadas.">
                  <div className="space-y-2">
                    {result?.relatedPurchases.map((purchase) => (
                      <div key={purchase._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="font-medium">Compra {purchase.number ?? "S/N"}</p>
                          <p className="text-xs text-muted-foreground">{purchase.supplierName} · {purchase.status}</p>
                        </div>
                        <Badge variant="secondary">Compra</Badge>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>

              <Card className="p-5">
                <Section title="Vehículos" emptyLabel="Sin vehículos relacionados.">
                  <div className="space-y-2">
                    {result?.relatedVehicles.map((vehicle) => (
                      <div key={vehicle._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <div>
                          <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
                        </div>
                        <Badge variant="secondary">Vehículo</Badge>
                      </div>
                    ))}
                  </div>
                </Section>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
