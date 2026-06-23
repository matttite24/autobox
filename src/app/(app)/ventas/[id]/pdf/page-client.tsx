"use client";

import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import { PdfTabLoader } from "@/components/pdf/pdf-tab-loader";
import { SalePdfDocument } from "@/components/pdf/sale-pdf-document";

export default function SalePdfClientPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const sale = useQuery(api.sales.getById, id ? { id: id as Id<"sales"> } : "skip");
  const settings = useQuery(api.organizations.settings, sale?.orgId ? { orgId: sale.orgId } : "skip");

  if (sale === undefined || settings === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando venta...</div>;
  }
  if (!sale) {
    return <div className="p-6 text-sm text-destructive">Venta no encontrada.</div>;
  }

  return (
    <PdfTabLoader
      title={`VENTA-${String(sale.number ?? "").padStart(4, "0")}`}
      pdfDocument={
        <SalePdfDocument
          sale={sale}
          orgName={settings?.commercialName ?? "Taller"}
          fiscalName={settings?.fiscalName}
          taxRate={settings?.taxRate ?? 15}
        />
      }
    />
  );
}
