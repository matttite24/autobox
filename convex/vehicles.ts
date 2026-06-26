import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

export const getByClient = query({
  args: { 
    orgId: v.id("organizations"),
    clientId: v.id("clients") 
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("vehicles")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    clientId: v.id("clients"),
    plate: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db.insert("vehicles", args);
  },
});

export const get = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
    
    // Join with clients
    const vehiclesWithClient = await Promise.all(
      vehicles.map(async (v) => {
        const client = await ctx.db.get(v.clientId);
        return {
          ...v,
          clientName: client?.name || "Cliente Desconocido",
          clientData: client,
        };
      })
    );
    
    return vehiclesWithClient;
  },
});

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    clientId: v.id("clients"),
    plate: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "vehicles", args.id);
    const { id, ...data } = args;
    return await ctx.db.patch(id, data);
  },
});

export const getHistoryByVehicle = query({
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

    const enriched = await Promise.all(
      orders.map(async (order) => {
        let workerName: string | null = null;
        if (order.assignedWorkerId) {
          const w = await ctx.db.get(order.assignedWorkerId);
          if (w) workerName = w.name;
        }

        const itemsTotal = (order.items ?? []).reduce(
          (sum, i) => sum + i.total,
          0
        );
        const paymentsTotal = (order.payments ?? []).reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const partsCount = (order.items ?? []).filter(
          (i) => i.type === "part"
        ).length;
        const laborCount = (order.items ?? []).filter(
          (i) => i.type === "labor" || i.type === "service"
        ).length;

        return {
          ...order,
          workerName,
          itemsTotal,
          paymentsTotal,
          partsCount,
          laborCount,
          isPaid: paymentsTotal >= itemsTotal && itemsTotal > 0,
        };
      })
    );

    return enriched;
  },
});

export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "vehicles", args.id);
    // Check if vehicle has any associated work orders
    const orders = await ctx.db
      .query("work_orders")
      .filter((q) => q.eq(q.field("vehicleId"), args.id))
      .collect();

    if (orders.length > 0) {
      throw new Error("No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas.");
    }

    return await ctx.db.delete(args.id);
  },
});
