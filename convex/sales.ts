import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireOrgAccess, requireDocAccess } from "./access";

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("sales")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const { doc: sale } = await requireDocAccess(ctx, "sales", args.id);
    if (!sale) return null;
    const client = sale.clientId ? await ctx.db.get(sale.clientId) : null;
    return {
      ...sale,
      clientData: client,
    };
  },
});

export const getForFacturacion = internalQuery({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.id); // Internal queries skip auth
    if (!sale) return null;
    const client = sale.clientId ? await ctx.db.get(sale.clientId) : null;
    return { sale, client };
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    clientId: v.optional(v.id("clients")),
    clientName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    
    // Obtener el último número de venta para esta organización
    const lastSale = await ctx.db
      .query("sales")
      .withIndex("by_org_number", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .first();
      
    const nextNumber = lastSale?.number ? lastSale.number + 1 : 1;

    return await ctx.db.insert("sales", {
      orgId: args.orgId,
      number: nextNumber,
      clientId: args.clientId,
      clientName: args.clientName,
      status: "Pendiente",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("sales"),
    status: v.union(
      v.literal("Pendiente"),
      v.literal("Completada"),
      v.literal("Cancelada")
    ),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "sales", args.id);
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const setFacturacionState = internalMutation({
  args: {
    id: v.id("sales"),
    facturacionStatus: v.union(
      v.literal("pendiente"),
      v.literal("enviando"),
      v.literal("enviada"),
      v.literal("error")
    ),
    facturacionLabel: v.optional(v.string()),
    datilInvoiceId: v.optional(v.string()),
    datilInvoiceUrl: v.optional(v.string()),
    datilPdfUrl: v.optional(v.string()),
    datilXmlUrl: v.optional(v.string()),
    datilStatus: v.optional(v.string()),
    datilLastError: v.optional(v.string()),
    facturadaAt: v.optional(v.number()),
    facturacionAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Internal mutations skip auth
    await ctx.db.patch(args.id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

export const updateItems = mutation({
  args: {
    id: v.id("sales"),
    items: v.array(
      v.object({
        id: v.string(),
        type: v.union(v.literal("part"), v.literal("labor"), v.literal("service")),
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        total: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "sales", args.id);
    return await ctx.db.patch(args.id, {
      items: args.items,
      updatedAt: Date.now(),
    });
  },
});

export const updatePayments = mutation({
  args: {
    id: v.id("sales"),
    payments: v.array(
      v.object({
        id: v.string(),
        amount: v.number(),
        method: v.union(
          v.literal("Efectivo"),
          v.literal("Tarjeta"),
          v.literal("Transferencia")
        ),
        bankId: v.optional(v.id("banks")),
        networkId: v.optional(v.id("payment_networks")),
        date: v.number(),
        reference: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { doc: sale } = await requireDocAccess(ctx, "sales", args.id);
    if (!sale) throw new Error("Venta no encontrada");
    const previousPayments = sale.payments ?? [];
    const nextPayments = args.payments;
    const previousIds = new Set(previousPayments.map((payment) => payment.id));
    const nextIds = new Set(nextPayments.map((payment) => payment.id));
    const addedPayments = nextPayments.filter((payment) => !previousIds.has(payment.id));
    const removedPayments = previousPayments.filter((payment) => !nextIds.has(payment.id));
    for (const payment of addedPayments) {
      if (payment.amount <= 0) throw new Error("El monto del pago debe ser mayor a cero.");
      if (payment.method === "Tarjeta" && !payment.networkId) {
        throw new Error("La tarjeta requiere una red de cobro.");
      }
      if (payment.method === "Transferencia" && !payment.bankId) {
        throw new Error("La transferencia requiere un banco destino.");
      }
    }

    // Reverse finance transactions for removed payments
    for (const payment of removedPayments) {
      const tx = await ctx.db
        .query("finance_transactions")
        .withIndex("by_org_and_sourceModule", (q) =>
          q.eq("orgId", sale.orgId).eq("sourceModule", "ventas")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("paymentId"), payment.id),
            q.eq(q.field("sourceId"), String(sale._id)),
            q.eq(q.field("status"), "Confirmada"),
          )
        )
        .first();
      if (tx) {
        await ctx.runMutation(api.finances.reverseTransaction, { transactionId: tx._id });
      }
    }

    await ctx.db.patch(args.id, {
      payments: args.payments,
      updatedAt: Date.now(),
    });

    for (const payment of addedPayments) {
      await ctx.runMutation(api.finances.recordAutomaticPayment, {
        orgId: sale.orgId,
        kind: "Cobro",
        flow: "Ingreso",
        method: payment.method,
        amount: payment.amount,
        description: `Cobro de venta #${sale.number?.toString().padStart(4, "0") ?? "—"}`,
        source: "Venta",
        sourceModule: "ventas",
        sourceId: String(sale._id),
        paymentId: payment.id,
        bankId: payment.method === "Transferencia" ? payment.bankId : undefined,
        paymentNetworkId: payment.method === "Tarjeta" ? payment.networkId : undefined,
        grossAmount: payment.method === "Tarjeta" ? payment.amount : undefined,
        confirmedAt: payment.date,
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const { doc: sale } = await requireDocAccess(ctx, "sales", args.id);
    if (!sale) throw new Error("Venta no encontrada");
    const txs = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_sourceModule", (q) =>
        q.eq("orgId", sale.orgId).eq("sourceModule", "ventas")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceId"), String(sale._id)),
          q.eq(q.field("status"), "Confirmada"),
        )
      )
      .collect();
    for (const tx of txs) {
      await ctx.runMutation(api.finances.reverseTransaction, { transactionId: tx._id });
    }
    await ctx.db.delete(args.id);
  },
});
