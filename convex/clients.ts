import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess, requireDocAccess } from "./access";

type ClientRole = "Cliente" | "Proveedor" | "Trabajador";

function normalizeText(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : value.toString().trim();
}

/** Returns effective roles for a client, supporting legacy `type` field. */
function effectiveRoles(client: { type?: ClientRole; roles?: ClientRole[] }): ClientRole[] {
  if (client.roles && client.roles.length > 0) return client.roles;
  return [client.type ?? "Cliente"];
}

function hasRole(client: { type?: ClientRole; roles?: ClientRole[] }, role: ClientRole) {
  return effectiveRoles(client).includes(role);
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
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    if (args.type) {
      return clients.filter((c) => hasRole(c, args.type!));
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
      const matchesType = !args.type || hasRole(c, args.type);
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
    roles: v.array(v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    )),
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
    const isTrabajador = args.roles.includes("Trabajador");
    const normalized = {
      orgId: args.orgId,
      roles: args.roles,
      name: args.name.trim(),
      documentId: normalizeText(args.documentId) || undefined,
      email: args.email.trim(),
      phone: normalizeText(args.phone) || undefined,
      company: normalizeText(args.company) || undefined,
      baseSalary: isTrabajador ? args.baseSalary ?? 0 : undefined,
      employmentStatus: isTrabajador ? args.employmentStatus ?? "Activo" : undefined,
      hireDate: isTrabajador ? args.hireDate : undefined,
      jobTitle: isTrabajador ? normalizeText(args.jobTitle) || undefined : undefined,
      employmentNotes: isTrabajador ? normalizeText(args.employmentNotes) || undefined : undefined,
    };

    return await ctx.db.insert("clients", normalized);
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    roles: v.optional(v.array(v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    ))),
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
    const isTrabajador = data.roles ? data.roles.includes("Trabajador") : undefined;
    return await ctx.db.patch(id, {
      ...data,
      name: data.name?.trim(),
      documentId: data.documentId ? normalizeText(data.documentId) : data.documentId,
      email: data.email?.trim(),
      phone: data.phone ? normalizeText(data.phone) : data.phone,
      company: data.company ? normalizeText(data.company) : data.company,
      baseSalary: isTrabajador ? data.baseSalary ?? 0 : data.baseSalary,
      employmentStatus: isTrabajador ? data.employmentStatus ?? "Activo" : data.employmentStatus,
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
        roles: v.optional(v.array(v.union(v.literal("Cliente"), v.literal("Proveedor"), v.literal("Trabajador")))),
        // legacy support
        type: v.optional(v.union(v.literal("Cliente"), v.literal("Proveedor"), v.literal("Trabajador"))),
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

      const roles: ClientRole[] = item.roles ?? (item.type ? [item.type] : ["Cliente"]);
      const isTrabajador = roles.includes("Trabajador");

      await ctx.db.insert("clients", {
        orgId: args.orgId,
        roles,
        name: item.name.trim(),
        documentId: item.documentId?.trim() || undefined,
        email: item.email?.trim() || "",
        phone: item.phone?.trim() || undefined,
        company: item.company?.trim() || undefined,
        ...(isTrabajador ? { employmentStatus: "Activo" as const, baseSalary: 0 } : {}),
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
      // Migrate legacy type to roles if needed
      const nextRoles: ClientRole[] = client.roles && client.roles.length > 0
        ? client.roles
        : [client.type ?? "Cliente"];

      const needsUpdate =
        client.documentId !== nextDocumentId ||
        client.phone !== nextPhone ||
        client.company !== nextCompany ||
        client.name !== nextName ||
        client.email !== nextEmail ||
        !client.roles;

      if (!needsUpdate) continue;

      await ctx.db.patch(client._id, {
        name: nextName,
        email: nextEmail,
        documentId: nextDocumentId,
        phone: nextPhone,
        company: nextCompany,
        roles: nextRoles,
      });
      updated += 1;
    }

    return { scanned: clients.length, updated };
  },
});

export const remove = mutation({
  args: {
    id: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const { doc, access } = await requireDocAccess(ctx, "clients", args.id);
    const orgId = access.membership.orgId;

    const roles = effectiveRoles(doc);
    const isTrabajador = roles.includes("Trabajador");
    const isProveedor = roles.includes("Proveedor");
    const isCliente = roles.includes("Cliente");

    if (isTrabajador) {
      const payrolls = await ctx.db.query("payroll_payments").withIndex("by_workerId", q => q.eq("workerId", args.id)).first();
      if (payrolls) throw new Error("No se puede eliminar porque tiene pagos de nómina asociados.");

      const advances = await ctx.db.query("salary_advances").withIndex("by_workerId", q => q.eq("workerId", args.id)).first();
      if (advances) throw new Error("No se puede eliminar porque tiene anticipos de sueldo asociados.");

      const finance = await ctx.db.query("finance_transactions").withIndex("by_org_and_confirmedAt", q => q.eq("orgId", orgId)).filter(q => q.eq(q.field("workerId"), args.id)).first();
      if (finance) throw new Error("No se puede eliminar porque tiene transacciones financieras asociadas.");
    }

    if (isCliente) {
      const vehicles = await ctx.db.query("vehicles").withIndex("by_client", q => q.eq("clientId", args.id)).first();
      if (vehicles) throw new Error("No se puede eliminar porque tiene vehículos registrados.");

      const workOrders = await ctx.db.query("work_orders").withIndex("by_client", q => q.eq("clientId", args.id)).first();
      if (workOrders) throw new Error("No se puede eliminar porque tiene órdenes de trabajo asociadas.");

      const sales = await ctx.db.query("sales").withIndex("by_client", q => q.eq("clientId", args.id)).first();
      if (sales) throw new Error("No se puede eliminar porque tiene ventas asociadas.");
    }

    if (isProveedor) {
      const purchases = await ctx.db.query("purchases").withIndex("by_supplier", q => q.eq("supplierId", args.id)).first();
      if (purchases) throw new Error("No se puede eliminar porque tiene compras asociadas.");

      const items = await ctx.db.query("inventory").withIndex("by_org", q => q.eq("orgId", orgId)).collect();
      const hasInventory = items.some(i => i.supplierIds?.includes(args.id));
      if (hasInventory) throw new Error("No se puede eliminar porque está asociado a productos en el inventario.");
    }

    await ctx.db.delete(args.id);
  }
});
