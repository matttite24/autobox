import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

export const get = query({
  args: {
    orgId: v.id("organizations"),
    billingType: v.optional(v.union(v.literal("unit"), v.literal("hour"))),
    status: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    if (args.searchTerm && args.searchTerm.trim() !== "") {
      let results = await ctx.db
        .query("services")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.searchTerm!).eq("orgId", args.orgId),
        )
        .collect();

      if (args.billingType) {
        results = results.filter((service) => service.billingType === args.billingType);
      }
      if (args.status) {
        results = results.filter((service) => service.status === args.status);
      }

      return results;
    }

    if (args.billingType && args.status) {
      return await ctx.db
        .query("services")
        .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", args.status!))
        .filter((q) => q.eq(q.field("billingType"), args.billingType))
        .order("desc")
        .collect();
    }

    if (args.billingType) {
      return await ctx.db
        .query("services")
        .withIndex("by_org_and_billingType", (q) => q.eq("orgId", args.orgId).eq("billingType", args.billingType!))
        .order("desc")
        .collect();
    }

    if (args.status) {
      return await ctx.db
        .query("services")
        .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("services")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    billingType: v.union(v.literal("unit"), v.literal("hour")),
    salePrice: v.number(),
    costPrice: v.number(),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    return await ctx.db.insert("services", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    billingType: v.optional(v.union(v.literal("unit"), v.literal("hour"))),
    salePrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    status: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "services", args.id);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("services"),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "services", args.id);
    return await ctx.db.delete(args.id);
  },
});
