import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function getTipoIdentificacion(documentId?: string): string {
  if (!documentId) return "07"; // consumidor final
  if (documentId.length === 13) return "04"; // RUC
  if (documentId.length === 10) return "05"; // cédula
  return "06"; // pasaporte u otro
}

function mapPaymentMethod(method: string): string {
  if (method === "Efectivo") return "efectivo";
  if (method === "Tarjeta") return "tarjeta_de_credito";
  if (method === "Transferencia") return "transferencia";
  return "efectivo";
}

export const getOrgSettings = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

export const recordAudit = internalMutation({
  args: {
    orgId: v.id("organizations"),
    sourceType: v.union(v.literal("orden"), v.literal("venta")),
    sourceId: v.string(),
    status: v.union(v.literal("pendiente"), v.literal("enviando"), v.literal("enviada"), v.literal("error")),
    action: v.union(v.literal("request"), v.literal("retry"), v.literal("success"), v.literal("failure")),
    attempt: v.number(),
    message: v.optional(v.string()),
    datilInvoiceId: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("facturacion_events", args);
  },
});

export const issueInvoice = action({
  args: {
    sourceType: v.union(v.literal("orden"), v.literal("venta")),
    sourceId: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: true; datilInvoiceId: string; status: string } | never> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autenticado");

    // Resolve the document
    const doc: any = args.sourceType === "venta"
      ? await ctx.runQuery(internal.sales.getForFacturacion, { id: args.sourceId as any })
      : await ctx.runQuery(internal.work_orders.getForFacturacion, { id: args.sourceId as any });

    if (!doc) throw new Error("No se encontró el documento.");

    const entity = args.sourceType === "venta" ? doc.sale : doc.order;
    const orgId = entity.orgId;

    await ctx.runQuery(internal.access.checkOrgAccess, { orgId });

    // Get org settings with Datil credentials
    const orgSettings = await ctx.runQuery(internal.datil.getOrgSettings, { orgId });
    if (!orgSettings) throw new Error("No se encontraron ajustes de la organización.");
    if (!orgSettings.datilApiKey) throw new Error("Falta la API Key de Datil. Configúrala en Ajustes > Datil.");
    if (!orgSettings.datilCertPassword) throw new Error("Falta la contraseña del certificado Datil. Configúrala en Ajustes > Datil.");

    const baseUrl = "https://link.datil.co";
    const taxRate = orgSettings.taxRate ?? 15;

    // Build invoice data
    const client = doc.client;
    const clientName = args.sourceType === "venta" ? doc.sale.clientName : (client?.name ?? "Consumidor Final");
    const items: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = entity.items ?? [];
    const payments: Array<{ id: string; amount: number; method: string }> = entity.payments ?? [];

    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const iva = subtotal * (taxRate / 100);
    const total = subtotal + iva;

    const payload = {
      ambiente: orgSettings.datilAmbiente ?? 1,
      tipo_emision: 1,
      fecha_emision: new Date().toISOString(),
      moneda: "USD",
      emisor: {
        ruc: orgSettings.ruc ?? "",
        razon_social: orgSettings.fiscalName ?? orgSettings.commercialName,
        nombre_comercial: orgSettings.commercialName,
        direccion: orgSettings.address ?? "",
        obligado_contabilidad: orgSettings.datilObligadoContabilidad ?? "NO",
        establecimiento: {
          codigo: orgSettings.datilEstablecimiento ?? "001",
          punto_emision: orgSettings.datilPuntoEmision ?? "001",
          direccion: orgSettings.address ?? "",
        },
      },
      receptor: {
        razon_social: clientName,
        identificacion: client?.documentId || "9999999999999",
        tipo_identificacion: getTipoIdentificacion(client?.documentId),
        email: client?.email ?? "",
        direccion: "",
        telefono: client?.phone ?? "",
      },
      detalles: items.map((item) => {
        const subtotalItem = item.total;
        const ivaItem = subtotalItem * (taxRate / 100);
        return {
          descripcion: item.description,
          cantidad: item.quantity,
          precio_unitario: item.unitPrice,
          descuento: 0,
          precio_total_sin_impuesto: subtotalItem,
          impuestos: [
            {
              base_imponible: subtotalItem,
              codigo: "2",
              codigo_porcentaje: taxRate === 0 ? "0" : "4",
              tarifa: taxRate,
              valor: ivaItem,
            },
          ],
        };
      }),
      totales: {
        total_sin_impuestos: subtotal,
        descuento_adicional: 0,
        propina: 0,
        importe_total: total,
        impuestos: [
          {
            base_imponible: subtotal,
            codigo: "2",
            codigo_porcentaje: taxRate === 0 ? "0" : "4",
            tarifa: taxRate,
            valor: iva,
          },
        ],
      },
      pagos: payments.map((p) => ({
        medio: mapPaymentMethod(p.method),
        total: p.amount,
        plazo: 0,
        unidad_tiempo: "dias",
      })),
    };

    await ctx.runMutation(internal.datil.recordAudit, {
      orgId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      status: "enviando",
      action: "request",
      attempt: 1,
      createdAt: Date.now(),
    });

    let lastError = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          await ctx.runMutation(internal.datil.recordAudit, {
            orgId,
            sourceType: args.sourceType,
            sourceId: args.sourceId,
            status: "enviando",
            action: "retry",
            attempt,
            createdAt: Date.now(),
          });
          await sleep(500 * attempt * attempt);
        }

        const response: Response = await fetch(`${baseUrl}/invoices/issue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Key": orgSettings.datilApiKey,
            "X-Password": orgSettings.datilCertPassword,
            "Idempotency-key": `${args.sourceType}-${args.sourceId}-${attempt}`,
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message ?? `Datil respondió ${response.status}`);
        }

        const invoiceId = data?.id ?? data?.invoice?.id ?? "";
        const status = data?.estado ?? data?.status ?? "enviada";
        const label = "Facturado";
        const urls = {
          datilInvoiceId: invoiceId || undefined,
          datilInvoiceUrl: invoiceId ? `${baseUrl}/edocs/${invoiceId}` : undefined,
          datilPdfUrl: invoiceId ? `https://app.datil.co/ver/${invoiceId}/pdf` : undefined,
          datilXmlUrl: invoiceId ? `https://app.datil.co/ver/${invoiceId}/xml` : undefined,
          datilStatus: typeof status === "string" ? status : undefined,
        };

        if (args.sourceType === "venta") {
          await ctx.runMutation(internal.sales.setFacturacionState, {
            id: args.sourceId as any,
            facturacionStatus: "enviada",
            facturacionLabel: label,
            facturadaAt: Date.now(),
            facturacionAttempts: attempt,
            ...urls,
          });
        } else {
          await ctx.runMutation(internal.work_orders.setFacturacionState, {
            id: args.sourceId as any,
            facturacionStatus: "enviada",
            facturacionLabel: label,
            facturadaAt: Date.now(),
            facturacionAttempts: attempt,
            ...urls,
          });
        }

        await ctx.runMutation(internal.datil.recordAudit, {
          orgId,
          sourceType: args.sourceType,
          sourceId: args.sourceId,
          status: "enviada",
          action: "success",
          attempt,
          datilInvoiceId: invoiceId,
          createdAt: Date.now(),
        });

        return { ok: true, datilInvoiceId: invoiceId, status };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Error desconocido";
      }
    }

    if (args.sourceType === "venta") {
      await ctx.runMutation(internal.sales.setFacturacionState, {
        id: args.sourceId as any,
        facturacionStatus: "error",
        facturacionLabel: "Facturado",
        datilLastError: lastError,
        facturacionAttempts: 3,
      });
    } else {
      await ctx.runMutation(internal.work_orders.setFacturacionState, {
        id: args.sourceId as any,
        facturacionStatus: "error",
        facturacionLabel: "Facturado",
        datilLastError: lastError,
        facturacionAttempts: 3,
      });
    }

    await ctx.runMutation(internal.datil.recordAudit, {
      orgId,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      status: "error",
      action: "failure",
      attempt: 3,
      message: lastError,
      createdAt: Date.now(),
    });

    throw new Error(lastError);
  },
});
