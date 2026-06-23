import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrgAccess } from "./access";

type SearchResultItem = {
  _id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "order" | "client" | "vehicle" | "inventory" | "sale" | "purchase";
  createdAt?: number;
  exact?: boolean;
  score?: number;
  relation?: string;
};

function matchScore(values: Array<string | number | null | undefined>, query: string) {
  const q = query.toLowerCase();
  let best = 0;

  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = value.toString().toLowerCase().trim();
    if (!text) continue;
    if (text === q) return 100;
    if (text.startsWith(q)) best = Math.max(best, 80 - Math.min(text.length, 20));
    else if (text.includes(q)) best = Math.max(best, 50 - text.indexOf(q));
  }

  return best;
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

function sortByScore<T extends { score?: number; exact?: boolean; createdAt?: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    if ((a.score ?? 0) !== (b.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

export const globalSearch = query({
  args: {
    orgId: v.id("organizations"),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const trimmedQuery = args.searchQuery.trim();
    const isNumericQuery = /^[0-9]+$/.test(trimmedQuery);

    if (!trimmedQuery || (!isNumericQuery && trimmedQuery.length < 2)) {
      return {
        clients: [],
        vehicles: [],
        orders: [],
        inventory: [],
        sales: [],
        purchases: [],
      };
    }

    const normalizedQuery = trimmedQuery.toLowerCase();
    const normalizedLookupQuery = normalizeLookup(trimmedQuery);
    const clientsAll = await ctx.db
      .query("clients")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const clients = sortByScore(
      clientsAll
        .map((client) => ({
          ...client,
          score:
            normalizeLookup(client._id) === normalizedLookupQuery ||
            normalizeLookup(toLookupText(client.documentId)) === normalizedLookupQuery
              ? 100
              : matchScore(
                  [
                    client.name,
                    client.documentId,
                    client.email,
                    client.phone,
                    client.company,
                    client.type,
                    normalizeDigits(client.phone),
                  ],
                  normalizedQuery,
              ),
          exact:
            client.name.trim().toLowerCase() === normalizedQuery ||
            normalizeLookup(client._id) === normalizedLookupQuery ||
            normalizeLookup(toLookupText(client.documentId)) === normalizedLookupQuery ||
            normalizeDigits(client.phone) === normalizeDigits(trimmedQuery) ||
            toLookupText(client.phone).toLowerCase().includes(normalizedQuery) ||
            toLookupText(client.documentId).toLowerCase().includes(normalizedQuery),
        }))
        .filter((client) => (client.score ?? 0) > 0),
    ).slice(0, 5);

    const matchedClientIds = clients.map((client) => client._id);
    const matchedClientNames = new Map(clients.map((client) => [client._id, client.name] as const));
    const matchedClientNameValues = [...matchedClientNames.values()].map((name) => name.toLowerCase());
    const matchedClientDocumentValues = clients
      .map((client) => toLookupText(client.documentId).toLowerCase())
      .filter((value): value is string => Boolean(value));

    // Search vehicles across plate, make, and model in parallel
    const vehiclesAll = await ctx.db
      .query("vehicles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const vehiclesRaw = sortByScore(
      vehiclesAll
        .map((vehicle) => ({
          ...vehicle,
          score: matchScore([vehicle.plate, vehicle.make, vehicle.model, vehicle.vin], normalizedQuery),
          exact: vehicle.plate.trim().toLowerCase() === normalizedQuery,
        }))
        .filter((vehicle) => (vehicle.score ?? 0) > 0),
    ).slice(0, 5);

    const parsedNumber = parseInt(trimmedQuery, 10);
    let ordersPromise;
    if (!isNaN(parsedNumber)) {
      const exactOrders = await ctx.db
        .query("work_orders")
        .withIndex("by_org_number", (q) =>
          q.eq("orgId", args.orgId).eq("number", parsedNumber)
        )
        .take(5);

      const partialOrders = await ctx.db
        .query("work_orders")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .collect();

      const seenOrderIds = new Set<string>();
      ordersPromise = Promise.resolve(
        [...exactOrders, ...partialOrders]
          .map((order) => ({
            ...order,
            score: matchScore([order.number], trimmedQuery),
            exact: order.number?.toString() === trimmedQuery,
          }))
          .filter((order) => {
          const numberText = order.number?.toString() ?? "";
          if (!numberText.includes(trimmedQuery)) return false;
          if (seenOrderIds.has(order._id)) return false;
          seenOrderIds.add(order._id);
          return true;
        }),
      );
    } else {
      // Search both symptoms and inspection, deduplicate
      const [bySymptoms, byInspection] = await Promise.all([
        ctx.db.query("work_orders")
          .withSearchIndex("search_symptoms", (q) =>
            q.search("symptoms", args.searchQuery).eq("orgId", args.orgId)
          ).take(5),
        ctx.db.query("work_orders")
          .withSearchIndex("search_inspection", (q) =>
            q.search("inspection", args.searchQuery).eq("orgId", args.orgId)
          ).take(5),
      ]);

      const seenOrderIds = new Set<string>();
      const merged = [...bySymptoms, ...byInspection].filter((o) => {
        if (seenOrderIds.has(o._id)) return false;
        seenOrderIds.add(o._id);
        return true;
      }).slice(0, 5);

      ordersPromise = Promise.resolve(merged);
    }

    const inventoryPromise = ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const salesPromise = ctx.db
      .query("sales")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const purchasesPromise = ctx.db
      .query("purchases")
      .withSearchIndex("search_supplier_name", (q) =>
        q.search("supplierName", args.searchQuery).eq("orgId", args.orgId)
      )
      .take(5);

    const [orders, inventory, sales, purchases] = await Promise.all([
      ordersPromise,
      inventoryPromise,
      salesPromise,
      purchasesPromise,
    ]);

    const relatedVehicles = matchedClientIds.length
      ? await Promise.all(
          matchedClientIds.map((clientId) =>
            ctx.db
              .query("vehicles")
              .withIndex("by_client", (q) => q.eq("clientId", clientId))
              .collect(),
          ),
        )
      : [];

    const enhancedVehicles = sortByScore(
      await Promise.all(
        [
          ...vehiclesRaw.map((v) => ({ ...v, relation: undefined })),
          ...relatedVehicles.flat().map((v) => ({
            ...v,
            relation: matchedClientNames.get(v.clientId) ? `Relacionado con ${matchedClientNames.get(v.clientId)}` : undefined,
          })),
        ]
          .filter((vehicle, index, self) => self.findIndex((item) => item._id === vehicle._id) === index)
          .map(async (vehicle) => {
            const client = await ctx.db.get(vehicle.clientId);
            return {
              ...vehicle,
              clientName: client?.name || "Cliente Desconocido",
              score: vehicle.relation
                ? Math.max(70, matchScore([vehicle.plate, vehicle.make, vehicle.model, vehicle.vin, vehicle.relation], normalizedQuery))
                : matchScore([vehicle.plate, vehicle.make, vehicle.model, vehicle.vin], normalizedQuery),
              exact: vehicle.plate.trim().toLowerCase() === normalizedQuery,
            };
          }),
      ),
    ).slice(0, 5);

    const relatedOrders = matchedClientIds.length
      ? await Promise.all(
          matchedClientIds.map((clientId) =>
            ctx.db
              .query("work_orders")
              .withIndex("by_client", (q) => q.eq("clientId", clientId))
              .collect(),
          ),
        )
      : [];

    const enhancedOrders = sortByScore(
      await Promise.all(
        [
          ...orders.map((o) => ({ ...o, relation: undefined })),
          ...relatedOrders.flat().map((o) => ({
            ...o,
            relation: matchedClientNames.get(o.clientId) ? `Relacionado con ${matchedClientNames.get(o.clientId)}` : undefined,
          })),
        ]
          .filter((order, index, self) => self.findIndex((item) => item._id === order._id) === index)
          .map(async (order) => {
            const client = await ctx.db.get(order.clientId);
            return {
              ...order,
              clientName: client?.name || "Cliente Desconocido",
              score: order.relation
                ? Math.max(70, matchScore([order.number, client?.name, order.status, order.relation], normalizedQuery))
                : matchScore([order.number, client?.name, order.status], normalizedQuery),
              exact: order.number?.toString() === trimmedQuery || client?.name?.trim().toLowerCase() === normalizedQuery,
            };
          }),
      ),
    ).filter((o) => (o.score ?? 0) > 0).slice(0, 5);

    const relatedSales = matchedClientIds.length
      ? await ctx.db
          .query("sales")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .collect()
      : [];

    const relatedPurchases = matchedClientIds.length
      ? await ctx.db
          .query("purchases")
          .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
          .collect()
      : [];

    const categoryIds = [...new Set(inventory.map((item) => item.categoryId))];
    const categories = await Promise.all(categoryIds.map((id) => ctx.db.get(id)));
    const categoryById = new Map(
      categories.flatMap((category) => (category ? [[category._id, category.name] as const] : [])),
    );

    const enhancedInventory = inventory
      .map((item) => ({
        ...item,
        score: matchScore([item.name, item.sku, item.code, item.description, item.supplier, item.location, item.status], normalizedQuery),
        exact:
          item.name.trim().toLowerCase() === normalizedQuery ||
          (item.sku ?? item.code).trim().toLowerCase() === normalizedQuery ||
          item.code.trim().toLowerCase() === normalizedQuery,
      }))
      .filter((item) => (item.score ?? 0) > 0)
      .sort((a, b) => sortByScore([a, b])[0]._id === a._id ? -1 : 1)
      .slice(0, 5)
      .map((item) => ({
      ...item,
      categoryName: categoryById.get(item.categoryId) ?? "Sin categoría",
      }));

    const enhancedSales: SearchResultItem[] = sortByScore(
      [
        ...sales.map((sale) => ({ ...sale, relation: undefined as string | undefined })),
        ...relatedSales
          .filter((sale) => {
            if (sale.clientId && matchedClientIds.includes(sale.clientId)) return true;
            return (
              matchedClientNameValues.some((clientName) => sale.clientName.toLowerCase().includes(clientName)) ||
              matchedClientDocumentValues.some((documentId) => sale.clientName.toLowerCase().includes(documentId))
            );
          })
          .map((sale) => {
            const relationClientId =
              sale.clientId && matchedClientIds.includes(sale.clientId)
                ? sale.clientId
                : matchedClientIds.find((clientId) => {
                    const clientName = matchedClientNames.get(clientId)?.toLowerCase() ?? "";
                    const documentId = clients.find((client) => client._id === clientId)?.documentId?.toLowerCase() ?? "";
                    return sale.clientName.toLowerCase().includes(clientName) || sale.clientName.toLowerCase().includes(documentId);
                  });

            return {
              ...sale,
              relation: relationClientId ? `Relacionado con ${matchedClientNames.get(relationClientId)}` : undefined,
            };
          }),
      ].map((sale) => ({
        _id: sale._id,
        title: `Venta #${sale.number ?? "S/N"}`,
        subtitle: sale.relation ? `${sale.clientName} · ${sale.status} · ${sale.relation}` : `${sale.clientName} · ${sale.status}`,
        href: `/ventas?saleId=${sale._id}`,
        kind: "sale" as const,
        createdAt: sale.createdAt,
        score: sale.relation
          ? Math.max(70, matchScore([sale.number ?? "", sale.clientName, sale.status, sale.relation], normalizedQuery))
          : matchScore([sale.number ?? "", sale.clientName, sale.status], normalizedQuery),
        exact:
          normalizedQuery === sale.clientName.trim().toLowerCase() ||
          normalizedQuery === sale.number?.toString() ||
          normalizedQuery === `venta ${sale.number ?? ""}`.trim(),
        relation: sale.relation,
      }))
      .filter((sale) => (sale.score ?? 0) > 0)
    ).slice(0, 5);

    const enhancedPurchases: SearchResultItem[] = sortByScore(
      [
        ...purchases.map((purchase) => ({ ...purchase, relation: undefined as string | undefined })),
        ...relatedPurchases
          .filter((purchase) => {
            if (matchedClientIds.includes(purchase.supplierId)) return true;
            return (
              matchedClientNameValues.some((clientName) => purchase.supplierName.toLowerCase().includes(clientName)) ||
              matchedClientDocumentValues.some((documentId) => purchase.supplierName.toLowerCase().includes(documentId))
            );
          })
          .map((purchase) => {
            const relationClientId =
              matchedClientIds.includes(purchase.supplierId)
                ? purchase.supplierId
                : matchedClientIds.find((clientId) => {
                    const clientName = matchedClientNames.get(clientId)?.toLowerCase() ?? "";
                    const documentId = clients.find((client) => client._id === clientId)?.documentId?.toLowerCase() ?? "";
                    return purchase.supplierName.toLowerCase().includes(clientName) || purchase.supplierName.toLowerCase().includes(documentId);
                  });

            return {
              ...purchase,
              relation: relationClientId ? `Relacionado con ${matchedClientNames.get(relationClientId)}` : undefined,
            };
          }),
      ].map((purchase) => ({
        _id: purchase._id,
        title: `Compra ${purchase.number ?? "S/N"}`,
        subtitle: purchase.relation ? `${purchase.supplierName} · ${purchase.status} · ${purchase.relation}` : `${purchase.supplierName} · ${purchase.status}`,
        href: `/compras?purchaseId=${purchase._id}`,
        kind: "purchase" as const,
        createdAt: purchase.createdAt,
        score: purchase.relation
          ? Math.max(70, matchScore([purchase.number ?? "", purchase.supplierName, purchase.status, purchase.relation], normalizedQuery))
          : matchScore([purchase.number ?? "", purchase.supplierName, purchase.status], normalizedQuery),
        exact: normalizedQuery === purchase.supplierName.trim().toLowerCase(),
        relation: purchase.relation,
      }))
      .filter((purchase) => (purchase.score ?? 0) > 0)
    ).slice(0, 5);

    return {
      clients,
      vehicles: enhancedVehicles,
      orders: enhancedOrders,
      inventory: enhancedInventory,
      sales: enhancedSales,
      purchases: enhancedPurchases,
    };
  },
});
