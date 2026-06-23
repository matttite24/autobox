import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { requireOrgAccess, requireDocAccess } from "./access";

function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

function itemMatchesSearch(item: {
  name: string;
  sku?: string;
  code: string;
  description?: string;
  quantity: number;
  minQuantity?: number;
  costPrice?: number;
  salePrice: number;
  supplier?: string;
  location?: string;
  status: "Activo" | "Inactivo";
}, term: string): boolean {
  const searchableValues = [
    item.name,
    item.sku ?? item.code,
    item.code,
    item.description,
    item.quantity,
    item.minQuantity,
    item.costPrice,
    item.salePrice,
    item.supplier,
    item.location,
    item.status,
  ];

  return searchableValues.some((value) => normalizeSearchValue(value).includes(term));
}

export const getById = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    const { doc } = await requireDocAccess(ctx, "inventory", args.id);
    return doc;
  },
});

export const get = query({
  args: {
    orgId: v.id("organizations"),
    categoryId: v.optional(v.id("categories")),
    supplierId: v.optional(v.id("clients")),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const searchTerm = args.searchTerm?.trim().toLowerCase() ?? "";

    let items;

    if (searchTerm !== "") {
      const baseItems = await ctx.db
        .query("inventory")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .collect();

      items = baseItems.filter((item) => {
        if (args.categoryId && item.categoryId !== args.categoryId) return false;
        if (args.supplierId && !(item.supplierIds ?? []).includes(args.supplierId)) return false;
        return itemMatchesSearch(item, searchTerm);
      });
    } else {
      if (args.categoryId) {
        items = await ctx.db
          .query("inventory")
          .withIndex("by_category", (q) =>
            q.eq("orgId", args.orgId).eq("categoryId", args.categoryId!)
          )
          .order("desc")
          .collect();
      } else {
        items = await ctx.db
          .query("inventory")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .order("desc")
          .collect();
      }
      if (args.supplierId) {
        items = items.filter((item) => (item.supplierIds ?? []).includes(args.supplierId!));
      }
    }

    return items;
  },
});

export const getPaginated = query({
  args: {
    orgId: v.id("organizations"),
    categoryId: v.optional(v.id("categories")),
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const searchTerm = args.searchTerm?.trim().toLowerCase() ?? "";

    if (searchTerm !== "") {
      const items = await ctx.db
        .query("inventory")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .collect();

      const filteredItems = items.filter((item) => {
        if (args.categoryId && item.categoryId !== args.categoryId) {
          return false;
        }

        return itemMatchesSearch(item, searchTerm);
      });

      const startIndex = args.paginationOpts.cursor
        ? Number.parseInt(args.paginationOpts.cursor, 10)
        : 0;
      const page = filteredItems.slice(startIndex, startIndex + args.paginationOpts.numItems);
      const nextCursor = startIndex + page.length;

      return {
        page,
        isDone: nextCursor >= filteredItems.length,
        continueCursor: nextCursor < filteredItems.length ? String(nextCursor) : null,
      };
    }

    const q = ctx.db.query("inventory");
    if (args.categoryId) {
      return await q
        .withIndex("by_category", (q) =>
          q.eq("orgId", args.orgId).eq("categoryId", args.categoryId!)
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await q
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getCategories = query({
  args: {
    orgId: v.id("organizations"),
  },
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
    sku: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.id("categories"),
    quantity: v.number(),
    minQuantity: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    salePrice: v.number(),
    supplier: v.optional(v.string()),
    supplierIds: v.optional(v.array(v.id("clients"))),
    location: v.optional(v.string()),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    if (args.quantity < 0) throw new Error("La cantidad no puede ser negativa.");
    if (args.salePrice < 0) throw new Error("El precio de venta no puede ser negativo.");
    if (args.costPrice !== undefined && args.costPrice < 0) throw new Error("El costo no puede ser negativo.");
    const code = args.code?.trim() || `INT-${Date.now().toString(36).toUpperCase()}`;
    return await ctx.db.insert("inventory", {
      ...args,
      code,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    quantity: v.optional(v.number()),
    minQuantity: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    salePrice: v.optional(v.number()),
    supplier: v.optional(v.string()),
    supplierIds: v.optional(v.array(v.id("clients"))),
    location: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "inventory", args.id);
    if (args.quantity !== undefined && args.quantity < 0) throw new Error("La cantidad no puede ser negativa.");
    if (args.salePrice !== undefined && args.salePrice < 0) throw new Error("El precio de venta no puede ser negativo.");
    if (args.costPrice !== undefined && args.costPrice < 0) throw new Error("El costo no puede ser negativo.");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("inventory"),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "inventory", args.id);
    return await ctx.db.delete(args.id);
  },
});

export const bulkCreate = mutation({
  args: {
    orgId: v.id("organizations"),
    items: v.array(
      v.object({
        name: v.string(),
        sku: v.optional(v.string()),
        code: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryName: v.string(),
        quantity: v.number(),
        minQuantity: v.optional(v.number()),
        costPrice: v.optional(v.number()),
        salePrice: v.number(),
        supplier: v.optional(v.string()),
        location: v.optional(v.string()),
        status: v.union(v.literal("Activo"), v.literal("Inactivo")),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    // Cache de categorías por nombre para no hacer N queries
    const categoryCache = new Map<string, Id<"categories">>();
    const getOrCreateCategory = async (name: string) => {
      const key = name.trim().toLowerCase();
      if (categoryCache.has(key)) return categoryCache.get(key)!;

      const existing = await ctx.db
        .query("categories")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
      const found = existing.find((c) => c.name.toLowerCase() === key);

      if (found) {
        categoryCache.set(key, found._id);
        return found._id;
      }

      const newId = await ctx.db.insert("categories", {
        orgId: args.orgId,
        name: name.trim(),
      });
      categoryCache.set(key, newId);
      return newId;
    };

    // Cache de proveedores por nombre normalizado
    const supplierCache = new Map<string, Id<"clients">>();
    const getAllSuppliers = async () => {
      if (supplierCache.size > 0) return;
      const suppliers = await ctx.db
        .query("clients")
        .withIndex("by_org_and_type", (q) => q.eq("orgId", args.orgId).eq("type", "Proveedor"))
        .collect();
      for (const s of suppliers) {
        supplierCache.set(s.name.trim().toLowerCase(), s._id);
      }
    };

    let created = 0;
    let skipped = 0;
    let autoCodeSeq = 0;
    const baseTs = Date.now().toString(36).toUpperCase();

    for (const item of args.items) {
      // Saltar duplicados por SKU si existe
      if (item.sku) {
        const existing = await ctx.db
          .query("inventory")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .collect();
        const duplicate = existing.find((i) => i.sku === item.sku);
        if (duplicate) {
          skipped++;
          continue;
        }
      }

      const categoryId = await getOrCreateCategory(item.categoryName);
      const code = item.code?.trim() || `INT-${baseTs}-${++autoCodeSeq}`;
      const { categoryName, ...rest } = item;

      // Resolver proveedor por nombre → supplierIds
      let supplierIds: Id<"clients">[] | undefined;
      if (item.supplier?.trim()) {
        await getAllSuppliers();
        const supplierId = supplierCache.get(item.supplier.trim().toLowerCase());
        if (supplierId) supplierIds = [supplierId];
      }

      await ctx.db.insert("inventory", {
        ...rest,
        orgId: args.orgId,
        code,
        categoryId,
        ...(supplierIds ? { supplierIds } : {}),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created++;
    }

    return { created, skipped };
  },
});
