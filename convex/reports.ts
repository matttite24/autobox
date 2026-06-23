import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess } from "./access";

// Returns daily revenue buckets for the given [from, to) range.
// Each bucket: { date: "YYYY-MM-DD", ventas: number, ordenes: number, total: number }
export const dailyRevenue = query({
  args: {
    orgId: v.id("organizations"),
    from: v.number(), // start of range (ms timestamp, start of day UTC)
    to: v.number(),   // end of range (ms timestamp, exclusive)
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const [rawSales, rawOrders] = await Promise.all([
      ctx.db
        .query("sales")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect(),
      ctx.db
        .query("work_orders")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect(),
    ]);

    // Build a map of date string -> { ventas, ordenes }
    const buckets = new Map<string, { ventas: number; ordenes: number }>();

    const dateKey = (ts: number) => {
      const d = new Date(ts);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };

    const fromKey = dateKey(args.from);
    const toKey = dateKey(args.to - 1);

    // Pre-fill all days in range
    const cursor = new Date(args.from);
    const end = new Date(args.to);
    while (cursor < end) {
      buckets.set(dateKey(cursor.getTime()), { ventas: 0, ordenes: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const sale of rawSales) {
      if (sale.status !== "Completada") continue;
      const ts = sale.updatedAt;
      if (ts < args.from || ts >= args.to) continue;
      const key = dateKey(ts);
      const total = (sale.items ?? []).reduce((s, i) => s + i.total, 0);
      const b = buckets.get(key)!;
      b.ventas += total;
    }

    for (const order of rawOrders) {
      if (order.status !== "Completada" && order.status !== "Entregado") continue;
      const ts = order.updatedAt;
      if (ts < args.from || ts >= args.to) continue;
      const key = dateKey(ts);
      if (!buckets.has(key)) continue;
      const total = (order.items ?? []).reduce((s, i) => s + i.total, 0);
      const b = buckets.get(key)!;
      b.ordenes += total;
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, { ventas, ordenes }]) => ({
        date,
        ventas,
        ordenes,
        total: ventas + ordenes,
      }));
  },
});
