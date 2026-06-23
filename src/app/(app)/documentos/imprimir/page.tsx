"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import { renderTemplateContent, type TemplateRecord } from "@/lib/document-templates";
import { defaultBlockTemplates, generateHtmlFromBlocks, DOC_SHARED_CSS, TICKET_PRINT_CSS, LABEL_PRINT_CSS } from "@/lib/block-templates";

type PrintContext = Record<string, unknown>;

function formatMoney(value: number) {
  return value.toFixed(2);
}

const ACCENT = "#374151";

function mkCell(val: string, align: "left" | "right", zebra: boolean) {
  return (
    `<td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #f0f0f0;color:#4b5563;` +
    `vertical-align:top;text-align:${align};${align === "right" ? "white-space:nowrap;" : ""}` +
    `${zebra ? "background:#fafafa;" : ""}">${val}</td>`
  );
}

type LineItem = { id: string; type: string; description: string; quantity: number; unitPrice: number; total: number };

function renderGroupedTable(items: LineItem[]): string {
  const thBase =
    `background:${ACCENT};color:#fff;padding:5px 8px;font-size:9px;` +
    `text-transform:uppercase;letter-spacing:0.06em;font-weight:600;`;
  const header =
    `<thead><tr>` +
    `<th style="${thBase}text-align:left;">Descripción</th>` +
    `<th style="${thBase}text-align:right;">Cant.</th>` +
    `<th style="${thBase}text-align:right;">P. Unit.</th>` +
    `<th style="${thBase}text-align:right;">Total</th>` +
    `</tr></thead>`;
  const groupLabel = (label: string) =>
    `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;` +
    `color:#9ca3af;border-left:2px solid ${ACCENT};padding-left:6px;margin:10px 0 4px;">${label}</div>`;
  const subtotalRow = (subtotal: number) =>
    `<tr><td colspan="3" style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>` +
    `<td style="padding:4px 8px;font-size:11px;font-weight:700;color:${ACCENT};text-align:right;border-top:1px solid #e5e7eb;">${subtotal.toFixed(2)}</td></tr>`;

  const groups: Array<{ label: string; type: string }> = [
    { label: "Repuestos", type: "part" },
    { label: "Mano de obra", type: "labor" },
    { label: "Servicios", type: "service" },
  ];

  return groups
    .map(({ label, type }) => {
      const group = items.filter((i) => i.type === type);
      if (!group.length) return "";
      const subtotal = group.reduce((a, i) => a + i.total, 0);
      return (
        groupLabel(label) +
        `<table style="width:100%;border-collapse:collapse;font-size:11px;">` +
        header +
        `<tbody>${renderItemRows(group, false)}${subtotalRow(subtotal)}</tbody>` +
        `</table>`
      );
    })
    .join("");
}

function renderItemRows(items: LineItem[], showType = true) {
  if (!items.length) {
    return `<tr><td colspan="${showType ? 5 : 4}" style="padding:10px 8px;font-size:11px;color:#9ca3af;">Sin ítems registrados</td></tr>`;
  }
  return items
    .map((item, i) => {
      const z = i % 2 === 1;
      return (
        `<tr>` +
        (showType ? mkCell(item.type === "part" ? "Repuesto" : item.type === "service" ? "Servicio" : "Mano de obra", "left", z) : "") +
        mkCell(item.description ?? "", "left", z) +
        mkCell(String(item.quantity), "right", z) +
        mkCell(item.unitPrice.toFixed(2), "right", z) +
        mkCell(item.total.toFixed(2), "right", z) +
        `</tr>`
      );
    })
    .join("");
}

function renderPaymentRows(payments: Array<{ id: string; method: string; amount: number; reference?: string | null }>) {
  if (!payments.length) {
    return `<tr><td colspan="3" style="padding:10px 8px;font-size:11px;color:#9ca3af;">Sin pagos registrados</td></tr>`;
  }
  return payments
    .map((payment, i) => {
      const z = i % 2 === 1;
      return (
        `<tr>` +
        mkCell(payment.method ?? "", "left", z) +
        mkCell(payment.amount.toFixed(2), "right", z) +
        mkCell(payment.reference ?? "—", "left", z) +
        `</tr>`
      );
    })
    .join("");
}

export default function DocumentPrintPage() {
  const params = useSearchParams();
  const kind = params.get("kind") as "orden" | "venta" | "compra" | "etiqueta" | "ticket" | null;
  const id = params.get("id");
  const templateId = params.get("templateId");
  const printedRef = useRef(false);

  const order = useQuery(api.work_orders.getById, kind === "orden" && id ? { id: id as Id<"work_orders"> } : "skip");
  const sale = useQuery(api.sales.getById, (kind === "venta" || kind === "ticket") && id ? { id: id as Id<"sales"> } : "skip");
  const purchase = useQuery(api.purchases.getById, kind === "compra" && id ? { id: id as Id<"purchases"> } : "skip");
  const product = useQuery(api.inventory.getById, kind === "etiqueta" && id ? { id: id as Id<"inventory"> } : "skip");
  const orgId = kind === "orden" ? order?.orgId
    : (kind === "venta" || kind === "ticket") ? sale?.orgId
    : kind === "compra" ? purchase?.orgId
    : kind === "etiqueta" ? product?.orgId
    : undefined;
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");

  useEffect(() => {
    document.title = "Imprimir documento";
  }, []);

  const source = kind === "orden" ? order
    : (kind === "venta" || kind === "ticket") ? sale
    : kind === "compra" ? purchase
    : kind === "etiqueta" ? product
    : undefined;

  const templates = useMemo((): TemplateRecord[] => {
    const saved = settings?.templates;
    const base = saved && saved.length > 0 ? saved : defaultBlockTemplates().map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      kind: tpl.kind,
      format: "html" as const,
      content: generateHtmlFromBlocks(tpl.blocks, tpl.kind),
      updatedAt: Date.now(),
    }));
    // For etiqueta/ticket filter to matching kind; if none saved yet use defaults
    if (kind === "etiqueta" || kind === "ticket") {
      const filtered = base.filter((t) => t.kind === kind);
      return filtered.length > 0 ? filtered : base;
    }
    return base;
  }, [settings?.templates, kind]);
  const template = templates.find((item: TemplateRecord) => item.id === templateId) ?? templates[0];

  const context = useMemo<PrintContext>(() => {
    if (!source || !settings) return {};
    const organization = {
      name: settings.commercialName ?? "",
      fiscalName: settings.fiscalName ?? "",
    };

    if (kind === "orden" && "clientData" in source && "vehicleData" in source) {
      const allItems = source.items ?? [];
      const parts = allItems.filter((i) => i.type === "part");
      const labor = allItems.filter((i) => i.type === "labor");
      const service = allItems.filter((i) => i.type === "service");
      const subtotal = allItems.reduce((acc, item) => acc + item.total, 0);
      const paid = (source.payments ?? []).reduce((acc, payment) => acc + payment.amount, 0);
      return {
        organization,
        client: source.clientData ?? {},
        vehicle: source.vehicleData ?? {},
        items: {
          count: allItems.length,
          table: renderItemRows(allItems),
          tableParts: renderItemRows(parts, false),
          tableLabor: renderItemRows(labor, false),
          tableService: renderItemRows(service, false),
          groupedTable: renderGroupedTable(allItems),
        },
        payments: {
          count: (source.payments ?? []).length,
          table: renderPaymentRows(source.payments ?? []),
        },
        totals: {
          subtotal: formatMoney(subtotal),
          iva: "",
          total: formatMoney(subtotal),
          paid: formatMoney(paid),
          balance: formatMoney(subtotal - paid),
          partsSubtotal: formatMoney(parts.reduce((a, i) => a + i.total, 0)),
          laborSubtotal: formatMoney(labor.reduce((a, i) => a + i.total, 0)),
          serviceSubtotal: formatMoney(service.reduce((a, i) => a + i.total, 0)),
        },
        facturacion: {
          status: source.facturacionStatus ?? "",
          label: source.facturacionLabel ?? "",
        },
        order: {
          ...source,
          createdAt: new Date(source._creationTime).toLocaleString(),
          updatedAt: new Date(source._creationTime).toLocaleString(),
        },
      };
    }

    if (kind === "venta" && "clientData" in source) {
      const allItems = source.items ?? [];
      const parts = allItems.filter((i) => i.type === "part");
      const labor = allItems.filter((i) => i.type === "labor");
      const service = allItems.filter((i) => i.type === "service");
      const subtotal = allItems.reduce((acc, item) => acc + item.total, 0);
      const paid = (source.payments ?? []).reduce((acc, payment) => acc + payment.amount, 0);
      return {
        organization,
        sale: {
          ...source,
          createdAt: new Date(source._creationTime).toLocaleString(),
          updatedAt: new Date(source._creationTime).toLocaleString(),
        },
        client: source.clientData ?? {},
        items: {
          count: allItems.length,
          table: renderItemRows(allItems),
          tableParts: renderItemRows(parts, false),
          tableLabor: renderItemRows(labor, false),
          tableService: renderItemRows(service, false),
          groupedTable: renderGroupedTable(allItems),
        },
        payments: {
          count: (source.payments ?? []).length,
          table: renderPaymentRows(source.payments ?? []),
        },
        totals: {
          subtotal: formatMoney(subtotal),
          iva: "",
          total: formatMoney(subtotal),
          paid: formatMoney(paid),
          balance: formatMoney(subtotal - paid),
          partsSubtotal: formatMoney(parts.reduce((a, i) => a + i.total, 0)),
          laborSubtotal: formatMoney(labor.reduce((a, i) => a + i.total, 0)),
          serviceSubtotal: formatMoney(service.reduce((a, i) => a + i.total, 0)),
        },
        facturacion: {
          status: source.facturacionStatus ?? "",
          label: source.facturacionLabel ?? "",
        },
      };
    }

    if (kind === "etiqueta" && "salePrice" in source) {
      return {
        organization,
        product: {
          name: source.name ?? "",
          sku: source.sku ?? source.code ?? "",
          code: source.code ?? "",
          location: source.location ?? "",
          description: source.description ?? "",
          salePrice: `$${(source.salePrice ?? 0).toFixed(2)}`,
          costPrice: `$${(source.costPrice ?? 0).toFixed(2)}`,
        },
      };
    }

    if (kind === "ticket" && "clientData" in source) {
      const allItems = source.items ?? [];
      const subtotal = allItems.reduce((acc, item) => acc + item.total, 0);
      const taxRate = (settings.taxRate ?? 0) / 100;
      const iva = subtotal * taxRate;
      const total = subtotal + iva;
      const paid = (source.payments ?? []).reduce((acc, p) => acc + p.amount, 0);

      const itemsRows = allItems.map((item) =>
        `<div style="display:flex;justify-content:space-between;font-size:10px;padding:1px 0;border-bottom:1px dotted #e5e7eb;">` +
        `<span style="flex:1;padding-right:4px;">${item.description}</span>` +
        `<span style="width:10%;text-align:right;">${item.quantity}</span>` +
        `<span style="width:18%;text-align:right;">${item.total.toFixed(2)}</span>` +
        `</div>`
      ).join("");

      return {
        organization,
        document: {
          number: source.number ?? "",
          createdAt: new Date(source._creationTime).toLocaleString(),
          status: source.status ?? "",
        },
        client: source.clientData ?? {},
        ticket: { itemsRows },
        totals: {
          subtotal: formatMoney(subtotal),
          iva: formatMoney(iva),
          total: formatMoney(total),
          paid: formatMoney(paid),
          balance: formatMoney(total - paid),
        },
      };
    }

    return { organization };
  }, [kind, settings, source]);

  const content = template ? renderTemplateContent(template, context) : "";

  const isLoading = source === undefined || settings === undefined;
  const isMissing = source !== undefined && source !== null && !source;
  const readyToPrint = Boolean(source && settings && template && content.trim());
  const isTicket = kind === "ticket";
  const isLabel = kind === "etiqueta";

  const needsBarcode = isLabel;

  useEffect(() => {
    if (!readyToPrint || printedRef.current) return;

    const renderBarcodesAndPrint = async () => {
      if (needsBarcode) {
        try {
          const JsBarcode = (await import("jsbarcode")).default;
          document.querySelectorAll("svg.jbarcode").forEach((el) => {
            const val = el.getAttribute("data-value");
            if (!val || val.trim() === "" || val.startsWith("{{")) return;
            try {
              JsBarcode(el, val, {
                format: el.getAttribute("data-format") ?? "CODE128",
                displayValue: false,
                margin: 2,
                width: 1.2,
                height: 30,
                background: "#ffffff",
                lineColor: "#000000",
              });
            } catch { /* ignore invalid barcode chars */ }
          });
        } catch { /* jsbarcode not available */ }
      }

      window.parent?.postMessage({ type: "autobox-print-ready" }, "*");
      printedRef.current = true;
      window.setTimeout(() => window.print(), 100);
    };

    const timer = window.setTimeout(renderBarcodesAndPrint, 250);
    return () => window.clearTimeout(timer);
  }, [readyToPrint, needsBarcode]);

  useEffect(() => {
    const handleAfterPrint = () => window.close();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando documento...</div>;
  }
  if (isMissing) {
    return <div className="p-6 text-sm text-destructive">Documento no encontrado.</div>;
  }

  const pageSize = isTicket ? "80mm auto" : isLabel ? "62mm 29mm" : "A4";
  const pageMargin = isTicket ? "3mm 4mm" : isLabel ? "1mm" : "12mm";

  return (
    <div className={`print-root min-h-screen text-zinc-900 ${isTicket || isLabel ? "bg-gray-100 flex justify-center p-4" : "bg-[#e9e9e6] p-6"}`}>
      <style jsx global>{`
        @page { size: ${pageSize}; margin: ${pageMargin}; }
        @media print {
          html, body { background: #ffffff !important; }
          body * { visibility: hidden; }
          .print-root, .print-root * { visibility: visible; }
          .print-root { position: absolute; inset: 0; padding: 0; background: white; display: block; }
          .doc-shell { box-shadow: none !important; border: none !important; }
        }
        ${isTicket ? TICKET_PRINT_CSS : isLabel ? LABEL_PRINT_CSS : DOC_SHARED_CSS}
      `}</style>

      {isTicket ? (
        <div style={{ width: "80mm", background: "white", padding: "4px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
          <div className="doc-template" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      ) : isLabel ? (
        <div style={{ width: "62mm", minHeight: "29mm", background: "white", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
          <div className="doc-template" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      ) : (
        <div className="doc-shell">
          <div className="doc-body">
            <div className="doc-template" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      )}
    </div>
  );
}
