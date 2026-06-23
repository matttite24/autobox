import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireOrgAccess, requireDocAccess } from "./access";

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("purchases")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) return null;
    const supplier = await ctx.db.get(purchase.supplierId);
    return {
      ...purchase,
      supplierData: supplier,
    };
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    number: v.optional(v.string()),
    supplierId: v.id("clients"),
    supplierName: v.string(),
    issueDate: v.number(),
    dueDate: v.optional(v.number()),
    items: v.array(
      v.object({
        id: v.string(),
        inventoryId: v.optional(v.id("inventory")),
        description: v.string(),
        quantity: v.number(),
        unitCost: v.number(),
        total: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();

    const purchaseId = await ctx.db.insert("purchases", {
      orgId: args.orgId,
      number: args.number,
      supplierId: args.supplierId,
      supplierName: args.supplierName,
      status: "Borrador",
      paymentStatus: "Pendiente",
      receivedAt: undefined,
      issueDate: args.issueDate,
      dueDate: args.dueDate,
      items: args.items,
      payments: [],
      createdAt: now,
      updatedAt: now,
    });

    return purchaseId;
  },
});

export const updatePayments = mutation({
  args: {
    id: v.id("purchases"),
    payments: v.array(
      v.object({
        id: v.string(),
        amount: v.number(),
        method: v.union(
          v.literal("Efectivo"),
          v.literal("Tarjeta"),
          v.literal("Transferencia"),
          v.literal("Cheque")
        ),
        bankId: v.optional(v.id("banks")),
        networkId: v.optional(v.id("payment_networks")),
        date: v.number(),
        reference: v.optional(v.string()),
      })
    ),
    paymentStatus: v.union(v.literal("Pendiente"), v.literal("Parcial"), v.literal("Pagado")),
  },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) throw new Error("Compra no encontrada");
    const previousPayments = purchase.payments ?? [];
    const nextPayments = args.payments;
    const previousIds = new Set(previousPayments.map((payment) => payment.id));
    const nextIds = new Set(nextPayments.map((payment) => payment.id));
    const addedPayments = nextPayments.filter((payment) => !previousIds.has(payment.id));
    const removedPayments = previousPayments.filter((payment) => !nextIds.has(payment.id));

    for (const payment of addedPayments) {
      if (payment.amount <= 0) throw new Error("El monto del pago debe ser mayor a cero.");
      if ((payment.method === "Transferencia" || payment.method === "Cheque") && !payment.bankId) {
        throw new Error("La transferencia o cheque requiere un banco destino.");
      }
      if (payment.method === "Tarjeta" && !payment.networkId) {
        throw new Error("La tarjeta requiere una red de cobro.");
      }
    }

    // Reverse finance transactions for removed payments
    for (const payment of removedPayments) {
      const tx = await ctx.db
        .query("finance_transactions")
        .withIndex("by_org_and_sourceModule", (q) =>
          q.eq("orgId", purchase.orgId).eq("sourceModule", "compras")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("paymentId"), payment.id),
            q.eq(q.field("sourceId"), String(purchase._id)),
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
      paymentStatus: args.paymentStatus,
      updatedAt: Date.now(),
    });

    for (const payment of addedPayments) {
      await ctx.runMutation(api.finances.recordAutomaticPayment, {
        orgId: purchase.orgId,
        kind: "Egreso",
        flow: "Salida",
        method: payment.method,
        amount: payment.amount,
        description: `Pago a proveedor compra ${purchase.number ?? ""}`.trim(),
        source: "Compra",
        sourceModule: "compras",
        sourceId: String(purchase._id),
        paymentId: payment.id,
        bankId: payment.method === "Transferencia" || payment.method === "Cheque" ? payment.bankId : undefined,
        paymentNetworkId: payment.method === "Tarjeta" ? payment.networkId : undefined,
        grossAmount: payment.method === "Tarjeta" ? payment.amount : undefined,
        confirmedAt: payment.date,
      });
    }
  },
});

export const closePurchase = mutation({
  args: {
    id: v.id("purchases"),
  },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) throw new Error("Compra no encontrada");

    if (purchase.status === "Cancelada") {
      throw new Error("No se puede cerrar una compra cancelada.");
    }

    if (purchase.status === "Recibida") {
      return args.id;
    }

    if ((purchase.items || []).length === 0) {
      throw new Error("No puedes cerrar una compra sin ítems.");
    }

    const now = Date.now();

    for (const item of purchase.items) {
      if (!item.inventoryId) continue;
      const inventoryItem = await ctx.db.get(item.inventoryId);
      if (!inventoryItem) continue;
      const existingSupplierIds = inventoryItem.supplierIds ?? [];
      const supplierIds = existingSupplierIds.includes(purchase.supplierId)
        ? existingSupplierIds
        : [...existingSupplierIds, purchase.supplierId];
      await ctx.db.patch(item.inventoryId, {
        quantity: inventoryItem.quantity + item.quantity,
        costPrice: item.unitCost,
        supplierIds,
        updatedAt: now,
      });
    }

    return await ctx.db.patch(args.id, {
      status: "Recibida",
      receivedAt: now,
      updatedAt: now,
    });
  },
});

export const updateItems = mutation({
  args: {
    id: v.id("purchases"),
    items: v.array(
      v.object({
        id: v.string(),
        inventoryId: v.optional(v.id("inventory")),
        description: v.string(),
        quantity: v.number(),
        unitCost: v.number(),
        total: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) throw new Error("Compra no encontrada");
    if (purchase.status === "Cancelada") {
      throw new Error("No se pueden editar compras canceladas.");
    }

    return await ctx.db.patch(args.id, {
      items: args.items,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("purchases"),
  },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) throw new Error("Compra no encontrada");
    
    if (purchase.status !== "Borrador") {
      for (const item of purchase.items) {
        if (!item.inventoryId) continue;
        const inventoryItem = await ctx.db.get(item.inventoryId);
        if (!inventoryItem) continue;
        if (purchase.status === "Recibida") {
          await ctx.db.patch(item.inventoryId, {
            quantity: Math.max(0, inventoryItem.quantity - item.quantity),
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Reverse all confirmed finance transactions for this purchase
    const txs = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_sourceModule", (q) =>
        q.eq("orgId", purchase.orgId).eq("sourceModule", "compras")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceId"), String(purchase._id)),
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

export const cancel = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const { doc: purchase } = await requireDocAccess(ctx, "purchases", args.id);
    if (!purchase) throw new Error("Compra no encontrada");

    if (purchase.status === "Cancelada") return args.id;

    if (purchase.status === "Recibida") {
      for (const item of purchase.items) {
        if (!item.inventoryId) continue;
        const inventoryItem = await ctx.db.get(item.inventoryId);
        if (!inventoryItem) continue;
        await ctx.db.patch(item.inventoryId, {
          quantity: Math.max(0, inventoryItem.quantity - item.quantity),
          updatedAt: Date.now(),
        });
      }
    }

    // Reverse any confirmed finance transactions for this purchase
    const txs = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_sourceModule", (q) =>
        q.eq("orgId", purchase.orgId).eq("sourceModule", "compras")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceId"), String(purchase._id)),
          q.eq(q.field("status"), "Confirmada"),
        )
      )
      .collect();
    for (const tx of txs) {
      await ctx.runMutation(api.finances.reverseTransaction, { transactionId: tx._id });
    }

    return await ctx.db.patch(args.id, {
      status: "Cancelada",
      updatedAt: Date.now(),
    });
  },
});
