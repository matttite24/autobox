import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("payment_networks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    alias: v.optional(v.string()),
    commissionRate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    return await ctx.db.insert("payment_networks", {
      orgId: args.orgId,
      name: args.name,
      alias: args.alias,
      commissionRate: args.commissionRate,
      status: "Activo",
      currentBalance: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("payment_networks"),
    name: v.string(),
    alias: v.optional(v.string()),
    commissionRate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "payment_networks", args.id);
    return await ctx.db.patch(args.id, {
      name: args.name,
      alias: args.alias,
      commissionRate: args.commissionRate,
      updatedAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("payment_networks"),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "payment_networks", args.id);
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
