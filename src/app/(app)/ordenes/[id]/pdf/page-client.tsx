"use client";

import { Suspense } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import { PdfTabLoader } from "@/components/pdf/pdf-tab-loader";
import dynamic from "next/dynamic";

const OrderPdfDocument = dynamic(
  () => import("@/components/pdf/order-pdf-document").then((m) => ({ default: m.OrderPdfDocument })),
  { ssr: false }
);

function OrderPdfClientPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const mode = searchParams.get("mode") === "cotizacion" ? "cotizacion" : "orden";
  const order = useQuery(api.work_orders.getById, id ? { id: id as Id<"work_orders"> } : "skip");
  const settings = useQuery(api.organizations.settings, order?.orgId ? { orgId: order.orgId } : "skip");

  if (order === undefined || settings === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando orden...</div>;
  }
  if (!order) {
    return <div className="p-6 text-sm text-destructive">Orden no encontrada.</div>;
  }

  const prefix = mode === "cotizacion" ? "COT" : "ODT";

  return (
    <PdfTabLoader
      title={`${prefix}-${String(order.number ?? "").padStart(4, "0")}`}
      pdfDocument={
        <OrderPdfDocument
          order={order}
          orgName={settings?.commercialName ?? "Taller"}
          fiscalName={settings?.fiscalName}
          taxRate={settings?.taxRate ?? 15}
          mode={mode}
        />
      }
    />
  );
}

export default function OrderPdfClientPageWrapper() {
  return (
    <Suspense>
      <OrderPdfClientPage />
    </Suspense>
  );
}
