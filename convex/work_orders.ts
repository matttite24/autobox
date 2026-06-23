import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { requireOrgAccess, requireDocAccess } from "./access";

type VehicleUpdate = {
  mileage?: number;
  nextMileage?: number;
};

export const get = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const orders = await ctx.db
      .query("work_orders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
    
    // Join with clients and vehicles
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const client = await ctx.db.get(order.clientId);
        
        let vehicle = null;
        if (order.vehicleId) {
          vehicle = await ctx.db.get(order.vehicleId);
        }

        return {
          ...order,
          clientName: client?.name || "Cliente Desconocido",
          clientPhone: client?.phone,
          clientData: client,
          vehicleData: vehicle,
        };
      })
    );
    
    return ordersWithDetails;
  },
});

export const getActive = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const activeStatuses = ["Pendiente", "En Progreso", "Listo", "Entregado"] as const;
    
    const results = await Promise.all(
      activeStatuses.map(status =>
        ctx.db
          .query("work_orders")
          .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", status))
          .collect()
      )
    );
    
    const orders = results.flat().sort((a, b) => b._creationTime - a._creationTime);
    
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const client = await ctx.db.get(order.clientId);
        
        let vehicle = null;
        if (order.vehicleId) {
          vehicle = await ctx.db.get(order.vehicleId);
        }

        return {
          ...order,
          clientName: client?.name || "Cliente Desconocido",
          clientPhone: client?.phone,
          clientData: client,
          vehicleData: vehicle,
        };
      })
    );
    
    return ordersWithDetails;
  },
});

export const getById = query({
  args: { id: v.id("work_orders") },
  handler: async (ctx, args) => {
    const { doc: order } = await requireDocAccess(ctx, "work_orders", args.id);
    if (!order) return null;

    const client = await ctx.db.get(order.clientId);
    const vehicle = order.vehicleId ? await ctx.db.get(order.vehicleId) : null;

    return {
      ...order,
      clientName: client?.name || "Cliente Desconocido",
      clientData: client,
      vehicleData: vehicle,
    };
  },
});

export const getForFacturacion = internalQuery({
  args: { id: v.id("work_orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;
    const client = await ctx.db.get(order.clientId);
    const vehicle = order.vehicleId ? await ctx.db.get(order.vehicleId) : null;
    return { order, client, vehicle };
  },
});

export const getByVehicle = query({
  args: {
    orgId: v.id("organizations"),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const orders = await ctx.db
      .query("work_orders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
      .order("desc")
      .collect();
    
    return orders;
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    symptoms: v.string(),
    inspection: v.string(),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    
    // Obtener el último número de orden para esta organización
    const lastOrder = await ctx.db
      .query("work_orders")
      .withIndex("by_org_number", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .first();
      
    const nextNumber = lastOrder?.number ? lastOrder.number + 1 : 1;

    const orderId = await ctx.db.insert("work_orders", {
      orgId: args.orgId,
      number: nextNumber,
      clientId: args.clientId,
      vehicleId: args.vehicleId,
      symptoms: args.symptoms,
      inspection: args.inspection,
      mileage: args.mileage,
      nextMileage: args.nextMileage,
      status: "Pendiente",
      createdAt: now,
      updatedAt: now,
    });

    // Update the vehicle's master mileage
    if (args.mileage !== undefined || args.nextMileage !== undefined) {
      const vehicleUpdates: VehicleUpdate = {};
      if (args.mileage !== undefined) vehicleUpdates.mileage = args.mileage;
      if (args.nextMileage !== undefined) vehicleUpdates.nextMileage = args.nextMileage;
      await ctx.db.patch(args.vehicleId, vehicleUpdates);
    }

    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("work_orders"),
    status: v.union(
      v.literal("Pendiente"),
      v.literal("En Progreso"),
      v.literal("Listo"),
      v.literal("Entregado"),
      v.literal("Completada"),
      v.literal("Cancelada")
    ),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "work_orders", args.id);
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const setFacturacionState = internalMutation({
  args: {
    id: v.id("work_orders"),
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

export const updateSymptoms = mutation({
  args: {
    id: v.id("work_orders"),
    symptoms: v.string(),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "work_orders", args.id);
    return await ctx.db.patch(args.id, {
      symptoms: args.symptoms,
      updatedAt: Date.now(),
    });
  },
});

export const updateDetails = mutation({
  args: {
    id: v.id("work_orders"),
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    symptoms: v.string(),
    inspection: v.string(),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "work_orders", args.id);
    const { id, ...data } = args;
    
    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });

    if (data.mileage !== undefined || data.nextMileage !== undefined) {
      const vehicleUpdates: VehicleUpdate = {};
      if (data.mileage !== undefined) vehicleUpdates.mileage = data.mileage;
      if (data.nextMileage !== undefined) vehicleUpdates.nextMileage = data.nextMileage;
      await ctx.db.patch(data.vehicleId, vehicleUpdates);
    }
  },
});

export const updateMileage = mutation({
  args: {
    id: v.id("work_orders"),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { doc: order } = await requireDocAccess(ctx, "work_orders", args.id);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(args.id, {
      mileage: args.mileage,
      nextMileage: args.nextMileage,
      updatedAt: Date.now(),
    });

    if (order.vehicleId && (args.mileage !== undefined || args.nextMileage !== undefined)) {
      const vehicleUpdates: VehicleUpdate = {};
      if (args.mileage !== undefined) vehicleUpdates.mileage = args.mileage;
      if (args.nextMileage !== undefined) vehicleUpdates.nextMileage = args.nextMileage;
      await ctx.db.patch(order.vehicleId, vehicleUpdates);
    }
  },
});

export const updateItems = mutation({
  args: {
    id: v.id("work_orders"),
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
    await requireDocAccess(ctx, "work_orders", args.id);
    return await ctx.db.patch(args.id, {
      items: args.items,
      updatedAt: Date.now(),
    });
  },
});

export const updatePayments = mutation({
  args: {
    id: v.id("work_orders"),
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
    const { doc: order } = await requireDocAccess(ctx, "work_orders", args.id);
    if (!order) throw new Error("Orden no encontrada");
    const previousPayments = order.payments ?? [];
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
          q.eq("orgId", order.orgId).eq("sourceModule", "ordenes")
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("paymentId"), payment.id),
            q.eq(q.field("sourceId"), String(order._id)),
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
    // auto finance movements
    for (const payment of addedPayments) {
      await ctx.runMutation(api.finances.recordAutomaticPayment, {
        orgId: order.orgId,
        kind: "Cobro",
        flow: "Ingreso",
        method: payment.method,
        amount: payment.amount,
        description: `Cobro de orden #${order.number?.toString().padStart(4, "0") ?? "—"}`,
        source: "Orden de trabajo",
        sourceModule: "ordenes",
        sourceId: String(order._id),
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
    id: v.id("work_orders"),
  },
  handler: async (ctx, args) => {
    const { doc: order } = await requireDocAccess(ctx, "work_orders", args.id);
    if (!order) throw new Error("Orden no encontrada");
    const txs = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_sourceModule", (q) =>
        q.eq("orgId", order.orgId).eq("sourceModule", "ordenes")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("sourceId"), String(order._id)),
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
