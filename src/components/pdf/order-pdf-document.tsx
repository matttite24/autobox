"use client";

import { format } from "date-fns";
import type { Doc } from "@convex/_generated/dataModel";
import { PdfDocumentShell } from "./shared-document";
import { Text, View } from "@react-pdf/renderer";

type OrderDoc = Doc<"work_orders"> & {
  clientName?: string;
  clientData?: Doc<"clients"> | null;
  vehicleData?: Doc<"vehicles"> | null;
};

export function OrderPdfDocument({
  order,
  orgName,
  fiscalName,
  taxRate,
}: {
  order: OrderDoc;
  orgName: string;
  fiscalName?: string;
  taxRate: number;
}) {
  const items = order.items ?? [];
  const payments = order.payments ?? [];
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const iva = subtotal * (taxRate / 100);
  const total = subtotal + iva;
  const paid = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const balance = total - paid;
  const displayFiscalName = fiscalName?.trim() || "No configurado";

  return (
    <PdfDocumentShell
      title={orgName}
      subtitle="Orden de trabajo"
      headingRight={{
        top: `ODT-${String(order.number ?? "").padStart(4, "0")}`,
        bottom: order.status,
      }}
      organizationLines={[
        { label: "", value: orgName },
        { label: "", value: displayFiscalName },
      ]}
      documentLines={[
        { label: "Número", value: `ODT-${String(order.number ?? "").padStart(4, "0")}` },
        { label: "Estado", value: order.status },
        { label: "Fecha", value: format(new Date(order._creationTime), "dd/MM/yyyy HH:mm") },
      ]}
      items={items}
      payments={payments}
      totals={[
        { label: "Subtotal", value: subtotal.toFixed(2) },
        { label: "IVA", value: iva.toFixed(2) },
        { label: "Total", value: total.toFixed(2), strong: true },
        { label: "Pagado", value: paid.toFixed(2) },
        { label: "Saldo", value: balance.toFixed(2), strong: true },
      ]}
      footerLeft={`Creada el ${format(new Date(order._creationTime), "dd/MM/yyyy HH:mm")}`}
      footerRight={`Estado: ${order.status}`}
      sections={
        <View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1 }}>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Cliente</Text>
                <Text>{order.clientName ?? order.clientData?.name ?? "Cliente"}</Text>
                <Text style={{ color: "#6b7280" }}>{order.clientData?.phone ?? "Sin teléfono"}</Text>
                <Text style={{ color: "#6b7280" }}>{order.clientData?.email ?? "Sin email"}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Vehículo</Text>
                <Text>
                  {order.vehicleData ? `${order.vehicleData.make} ${order.vehicleData.model}` : order.vehicle ?? "Sin vehículo"}
                </Text>
                <Text style={{ color: "#6b7280" }}>{order.vehicleData?.plate ? `Placa: ${order.vehicleData.plate}` : "Sin placa"}</Text>
                <Text style={{ color: "#6b7280" }}>{order.vehicleData?.mileage ? `Kilometraje: ${order.vehicleData.mileage}` : "Sin kilometraje"}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Diagnóstico</Text>
              <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, minHeight: 90 }}>
                <Text style={{ marginBottom: 8 }}>{order.symptoms ?? order.issue ?? "Sin síntomas registrados"}</Text>
                <Text style={{ color: "#6b7280" }}>{order.inspection ?? "Sin inspección registrada"}</Text>
              </View>
              <Text style={{ marginTop: 8, color: "#6b7280" }}>
                Próximo kilometraje: {order.nextMileage ?? "—"}
              </Text>
            </View>
          </View>
        </View>
      }
    />
  );
}
