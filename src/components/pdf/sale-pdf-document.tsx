"use client";

import { format } from "date-fns";
import type { Doc } from "@convex/_generated/dataModel";
import { PdfDocumentShell } from "./shared-document";
import { Text, View } from "@react-pdf/renderer";

type SaleDoc = Doc<"sales"> & {
  clientData?: Doc<"clients"> | null;
};

export function SalePdfDocument({
  sale,
  orgName,
  fiscalName,
  taxRate,
}: {
  sale: SaleDoc;
  orgName: string;
  fiscalName?: string;
  taxRate: number;
}) {
  const items = sale.items ?? [];
  const payments = sale.payments ?? [];
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const iva = subtotal * (taxRate / 100);
  const total = subtotal + iva;
  const paid = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const balance = total - paid;
  const displayFiscalName = fiscalName?.trim() || "No configurado";

  return (
    <PdfDocumentShell
      title={orgName}
      subtitle="Venta"
      headingRight={{
        top: `VENTA-${String(sale.number ?? "").padStart(4, "0")}`,
        bottom: sale.status,
      }}
      organizationLines={[
        { label: "", value: orgName },
        { label: "", value: displayFiscalName },
      ]}
      documentLines={[
        { label: "Número", value: `VENTA-${String(sale.number ?? "").padStart(4, "0")}` },
        { label: "Estado", value: sale.status },
        { label: "Fecha", value: format(new Date(sale._creationTime), "dd/MM/yyyy HH:mm") },
      ]}
      items={items}
      payments={payments}
      totals={[
        { label: "Subtotal", value: subtotal.toFixed(2) },
        { label: `IVA (${taxRate}%)`, value: iva.toFixed(2) },
        { label: "Total", value: total.toFixed(2), strong: true },
        { label: "Pagado", value: paid.toFixed(2) },
        { label: "Saldo", value: balance.toFixed(2), strong: true },
      ]}
      footerLeft={`Creada el ${format(new Date(sale._creationTime), "dd/MM/yyyy HH:mm")}`}
      footerRight={`Estado: ${sale.status}`}
      sections={
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Cliente</Text>
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10 }}>
              <Text>{sale.clientName}</Text>
              <Text style={{ color: "#6b7280" }}>{sale.clientData?.phone ?? "Sin teléfono"}</Text>
              <Text style={{ color: "#6b7280" }}>{sale.clientData?.email ?? "Sin email"}</Text>
              <Text style={{ marginTop: 8, color: "#6b7280" }}>Fecha: {format(new Date(sale._creationTime), "dd/MM/yyyy")}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Resumen</Text>
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10 }}>
              <Text>Total de ítems: {items.length}</Text>
              <Text style={{ marginTop: 6, color: "#6b7280" }}>Pagos registrados: {payments.length}</Text>
              <Text style={{ marginTop: 6, color: "#6b7280" }}>Saldo pendiente: {balance.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      }
    />
  );
}
