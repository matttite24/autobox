import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("categories")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    parentId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db.insert("categories", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    parentId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "categories", args.id);
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const { doc: category } = await requireDocAccess(ctx, "categories", args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if there are inventory items using this category
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_category", (q) => q.eq("orgId", category.orgId).eq("categoryId", args.id))
      .first();

    if (items) {
      throw new Error("No puedes eliminar una categoría en uso por el inventario.");
    }

    return await ctx.db.delete(args.id);
  },
});
