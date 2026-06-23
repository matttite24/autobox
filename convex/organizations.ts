import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireOrgAccess } from "./access";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
      
    const orgs = await Promise.all(
      memberships.map((m) => ctx.db.get(m.orgId))
    );
    return orgs.filter(Boolean);
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
      
    if (!membership) return null;
    return await ctx.db.get(membership.orgId);
  },
});

export const initDefaultOrg = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
      
    if (existingMembership) {
      return existingMembership.orgId;
    }
    
    // Si no tiene membresía, creamos una por defecto
    const user = await ctx.db.get(userId);
    const orgId = await ctx.db.insert("organizations", {
      name: `Taller de ${user?.name || user?.email?.split('@')[0] || "Usuario"}`,
    });
    
    await ctx.db.insert("memberships", {
      userId,
      orgId,
      role: "owner"
    });
    
    return orgId;
  },
});

export const updateCurrent = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
      
    if (!membership) throw new Error("No organization found");
    
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("No tienes permisos para editar la organización");
    }

    return await ctx.db.patch(membership.orgId, {
      name: args.name,
    });
  },
});

export const settings = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

export const upsertSettings = mutation({
  args: {
    orgId: v.id("organizations"),
    commercialName: v.string(),
    fiscalName: v.optional(v.string()),
    ruc: v.optional(v.string()),
    address: v.optional(v.string()),
    contact: v.optional(v.string()),
    website: v.optional(v.string()),
    legalRepresentative: v.optional(v.string()),
    taxRate: v.number(),
    zeroTaxRate: v.number(),
    roundingMode: v.union(v.literal("none"), v.literal("nearest"), v.literal("up"), v.literal("down")),
    currency: v.string(),
    enabledPaymentMethods: v.array(
      v.union(v.literal("Efectivo"), v.literal("Tarjeta"), v.literal("Transferencia"))
    ),
    profitPlans: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        percentage: v.number(),
        rounding: v.union(v.literal("none"), v.literal("nearest"), v.literal("up"), v.literal("down")),
      })
    ),
    defaultProfitPlanId: v.optional(v.string()),
    orderTemplate: v.optional(v.string()),
    saleTemplate: v.optional(v.string()),
    templates: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      kind: v.union(v.literal("orden"), v.literal("venta"), v.literal("etiqueta"), v.literal("ticket"), v.literal("custom")),
      format: v.literal("html"),
      content: v.string(),
      updatedAt: v.number(),
    }))),
    blockTemplates: v.optional(v.string()),
    datilApiKey: v.optional(v.string()),
    datilCertPassword: v.optional(v.string()),
    datilAmbiente: v.optional(v.union(v.literal(1), v.literal(2))),
    datilEstablecimiento: v.optional(v.string()),
    datilPuntoEmision: v.optional(v.string()),
    datilObligadoContabilidad: v.optional(v.union(v.literal("SI"), v.literal("NO"))),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    const existing = await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const data = {
      orgId: args.orgId,
      commercialName: args.commercialName,
      fiscalName: args.fiscalName,
      ruc: args.ruc,
      address: args.address,
      contact: args.contact,
      website: args.website,
      legalRepresentative: args.legalRepresentative,
      taxRate: args.taxRate,
      zeroTaxRate: args.zeroTaxRate,
      roundingMode: args.roundingMode,
      currency: args.currency,
      enabledPaymentMethods: args.enabledPaymentMethods,
      profitPlans: args.profitPlans,
      defaultProfitPlanId: args.defaultProfitPlanId,
      orderTemplate: args.orderTemplate,
      saleTemplate: args.saleTemplate,
      templates: args.templates,
      blockTemplates: args.blockTemplates,
      datilApiKey: args.datilApiKey,
      datilCertPassword: args.datilCertPassword,
      datilAmbiente: args.datilAmbiente,
      datilEstablecimiento: args.datilEstablecimiento,
      datilPuntoEmision: args.datilPuntoEmision,
      datilObligadoContabilidad: args.datilObligadoContabilidad,
      updatedAt: now,
    };

    if (existing) {
      return await ctx.db.patch(existing._id, data);
    }

    return await ctx.db.insert("organization_settings", {
      ...data,
      createdAt: now,
    });
  },
});

export const upsertDatilConfig = mutation({
  args: {
    orgId: v.id("organizations"),
    datilApiKey: v.optional(v.string()),
    datilCertPassword: v.optional(v.string()),
    datilAmbiente: v.optional(v.union(v.literal(1), v.literal(2))),
    datilEstablecimiento: v.optional(v.string()),
    datilPuntoEmision: v.optional(v.string()),
    datilObligadoContabilidad: v.optional(v.union(v.literal("SI"), v.literal("NO"))),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const existing = await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const patch = {
      datilApiKey: args.datilApiKey,
      datilCertPassword: args.datilCertPassword,
      datilAmbiente: args.datilAmbiente,
      datilEstablecimiento: args.datilEstablecimiento,
      datilPuntoEmision: args.datilPuntoEmision,
      datilObligadoContabilidad: args.datilObligadoContabilidad,
      updatedAt: Date.now(),
    };

    if (existing) {
      return await ctx.db.patch(existing._id, patch);
    }

    // No settings doc yet — create a minimal one
    throw new Error("Primero guarda los ajustes generales de la organización.");
  },
});
