import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("banks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    initialBalance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    const initialBalance = args.initialBalance ?? 0;
    return await ctx.db.insert("banks", {
      orgId: args.orgId,
      name: args.name,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      initialBalance,
      currentBalance: initialBalance,
      status: "Activo",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("banks"),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "banks", args.id);
    return await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("banks"),
    name: v.string(),
    accountNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "banks", args.id);
    return await ctx.db.patch(args.id, {
      name: args.name,
      accountNumber: args.accountNumber,
      updatedAt: Date.now(),
    });
  },
});
