import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

function normalizeText(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : value.toString().trim();
}

export const get = query({
  args: {
    orgId: v.id("organizations"),
    type: v.optional(v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    )),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    if (args.type === "Trabajador" || args.type === "Proveedor") {
      return await ctx.db
        .query("clients")
        .withIndex("by_org_and_type", (q) => q.eq("orgId", args.orgId).eq("type", args.type!))
        .order("desc")
        .collect();
    }

    let clients = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    if (args.type) {
      clients = clients.filter((client) => (client.type || "Cliente") === args.type);
    }

    return clients;
  },
});

export const search = query({
  args: { 
    orgId: v.id("organizations"),
    type: v.optional(v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    )),
    query: v.string() 
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const searchTerm = args.query.toLowerCase();
    return clients.filter((c) => {
      const matchesType = !args.type || (c.type || "Cliente") === args.type;
      const matchesText =
        c.name.toLowerCase().includes(searchTerm) ||
        normalizeText(c.documentId).toLowerCase().includes(searchTerm) ||
        (c.phone && c.phone.toLowerCase().includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm)) ||
        (c.company && c.company.toLowerCase().includes(searchTerm));

      return matchesType && matchesText;
    });
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    type: v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    ),
    name: v.string(),
    documentId: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    baseSalary: v.optional(v.number()),
    employmentStatus: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
    hireDate: v.optional(v.number()),
    jobTitle: v.optional(v.string()),
    employmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const normalized = {
      orgId: args.orgId,
      type: args.type,
      name: args.name.trim(),
      documentId: normalizeText(args.documentId) || undefined,
      email: args.email.trim(),
      phone: normalizeText(args.phone) || undefined,
      company: normalizeText(args.company) || undefined,
      baseSalary: args.type === "Trabajador" ? args.baseSalary ?? 0 : undefined,
      employmentStatus: args.type === "Trabajador" ? args.employmentStatus ?? "Activo" : undefined,
      hireDate: args.type === "Trabajador" ? args.hireDate : undefined,
      jobTitle: args.type === "Trabajador" ? normalizeText(args.jobTitle) || undefined : undefined,
      employmentNotes: args.type === "Trabajador" ? normalizeText(args.employmentNotes) || undefined : undefined,
    };

    return await ctx.db.insert("clients", {
      ...normalized,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    type: v.optional(v.union(v.literal("Cliente"), v.literal("Proveedor"), v.literal("Trabajador"))),
    name: v.optional(v.string()),
    documentId: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    baseSalary: v.optional(v.number()),
    employmentStatus: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
    hireDate: v.optional(v.number()),
    jobTitle: v.optional(v.string()),
    employmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireDocAccess(ctx, "clients", args.id);
    const { id, ...data } = args;
    const nextType = data.type;
    return await ctx.db.patch(id, {
      ...data,
      name: data.name?.trim(),
      documentId: data.documentId ? normalizeText(data.documentId) : data.documentId,
      email: data.email?.trim(),
      phone: data.phone ? normalizeText(data.phone) : data.phone,
      company: data.company ? normalizeText(data.company) : data.company,
      baseSalary: nextType === "Trabajador" ? data.baseSalary ?? 0 : data.baseSalary,
      employmentStatus: nextType === "Trabajador" ? data.employmentStatus ?? "Activo" : data.employmentStatus,
      jobTitle: data.jobTitle ? normalizeText(data.jobTitle) : data.jobTitle,
      employmentNotes: data.employmentNotes ? normalizeText(data.employmentNotes) : data.employmentNotes,
    });
  },
});

export const bulkCreate = mutation({
  args: {
    orgId: v.id("organizations"),
    items: v.array(
      v.object({
        type: v.union(v.literal("Cliente"), v.literal("Proveedor"), v.literal("Trabajador")),
        name: v.string(),
        documentId: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        company: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    let created = 0;
    let skipped = 0;

    for (const item of args.items) {
      // Omitir duplicados por documentId si existe
      if (item.documentId) {
        const existing = await ctx.db
          .query("clients")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .collect();
        const dup = existing.find(
          (c) => c.documentId && c.documentId.trim() === item.documentId!.trim()
        );
        if (dup) { skipped++; continue; }
      }

      await ctx.db.insert("clients", {
        orgId: args.orgId,
        type: item.type,
        name: item.name.trim(),
        documentId: item.documentId?.trim() || undefined,
        email: item.email?.trim() || "",
        phone: item.phone?.trim() || undefined,
        company: item.company?.trim() || undefined,
        ...(item.type === "Trabajador" ? { employmentStatus: "Activo" as const, baseSalary: 0 } : {}),
      });
      created++;
    }

    return { created, skipped };
  },
});

export const normalizeExistingClients = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    let updated = 0;

    for (const client of clients) {
      const nextDocumentId = normalizeText(client.documentId) || undefined;
      const nextPhone = normalizeText(client.phone) || undefined;
      const nextCompany = normalizeText(client.company) || undefined;
      const nextName = client.name.trim();
      const nextEmail = client.email.trim();
      const nextType = client.type || "Cliente";

      const needsUpdate =
        client.documentId !== nextDocumentId ||
        client.phone !== nextPhone ||
        client.company !== nextCompany ||
        client.name !== nextName ||
        client.email !== nextEmail ||
        client.type !== nextType;

      if (!needsUpdate) continue;

      await ctx.db.patch(client._id, {
        name: nextName,
        email: nextEmail,
        documentId: nextDocumentId,
        phone: nextPhone,
        company: nextCompany,
        type: nextType,
      });
      updated += 1;
    }

    return { scanned: clients.length, updated };
  },
});
