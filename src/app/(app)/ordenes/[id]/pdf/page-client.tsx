"use client";

import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import { PdfTabLoader } from "@/components/pdf/pdf-tab-loader";
import { OrderPdfDocument } from "@/components/pdf/order-pdf-document";

export default function OrderPdfClientPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const order = useQuery(api.work_orders.getById, id ? { id: id as Id<"work_orders"> } : "skip");
  const settings = useQuery(api.organizations.settings, order?.orgId ? { orgId: order.orgId } : "skip");

  if (order === undefined || settings === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando orden...</div>;
  }
  if (!order) {
    return <div className="p-6 text-sm text-destructive">Orden no encontrada.</div>;
  }

  return (
    <PdfTabLoader
      title={`ODT-${String(order.number ?? "").padStart(4, "0")}`}
      pdfDocument={
        <OrderPdfDocument
          order={order}
          orgName={settings?.commercialName ?? "Taller"}
          fiscalName={settings?.fiscalName}
          taxRate={settings?.taxRate ?? 15}
        />
      }
    />
  );
}
