import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrgAccess } from "./access";

type ClientRecord = {
  _id: string;
  name: string;
  documentId?: string;
  email: string;
  phone?: string;
  company?: string;
  type?: string;
};

function includesText(haystack: Array<string | undefined>, needle: string) {
  const q = needle.toLowerCase();
  return haystack
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(q));
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDigits(value: string | number | null | undefined) {
  return (value === null || value === undefined ? "" : value.toString()).replace(/\D/g, "");
}

function toLookupText(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : value.toString();
}

export const clientRelations = query({
  args: {
    orgId: v.id("organizations"),
    documentId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const needle = args.documentId.trim().toLowerCase();
    const normalizedNeedle = normalizeLookup(args.documentId.trim());
    const matchedClient = clients.find((client) =>
      [client.documentId, client.name, client.email, client.phone, client.company, client.type, client._id]
        .filter(Boolean)
        .some((value) => {
          const text = toLookupText(value).toLowerCase();
          return (
            text.includes(needle) ||
            normalizeLookup(text).includes(normalizedNeedle) ||
            normalizeDigits(text).includes(normalizeDigits(args.documentId))
          );
        }),
    ) as ClientRecord | undefined;

    if (!matchedClient) {
      return {
        client: null,
        relatedOrders: [],
        relatedSales: [],
        relatedPurchases: [],
        relatedVehicles: [],
      };
    }

    const allOrders = await ctx.db
      .query("work_orders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const allSales = await ctx.db
      .query("sales")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const allPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const allVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const relationNeedles = [
      matchedClient.name,
      matchedClient.documentId,
      matchedClient.email,
      matchedClient.phone,
      matchedClient.company,
    ].filter(Boolean) as string[];

    const relatedOrders = allOrders.filter((order) => order.clientId === matchedClient._id);
    const relatedVehicles = allVehicles.filter((vehicle) => vehicle.clientId === matchedClient._id);
    const relatedSales = allSales.filter((sale) =>
      sale.clientId === matchedClient._id ||
      includesText([sale.clientName], matchedClient.name) ||
      relationNeedles.some((value) => includesText([sale.clientName], value)) ||
      includesText([sale.clientName], matchedClient.documentId || ""),
    );
    const relatedPurchases = allPurchases.filter((purchase) =>
      purchase.supplierId === matchedClient._id ||
      includesText([purchase.supplierName], matchedClient.name) ||
      relationNeedles.some((value) => includesText([purchase.supplierName], value)),
    );

    return {
      client: matchedClient,
      relatedOrders,
      relatedSales,
      relatedPurchases,
      relatedVehicles,
    };
  },
});
