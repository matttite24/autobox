import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess } from "./access";

export const wipeCashSessions = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { membership } = await requireOrgAccess(ctx, args.orgId);
    if (membership.role !== "owner") throw new Error("Acceso denegado: Solo el propietario puede realizar esta acción");

    const transactions = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_confirmedAt", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const tx of transactions) await ctx.db.delete(tx._id);

    const sessions = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_openedAt", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    const banks = await ctx.db
      .query("banks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const bank of banks) await ctx.db.patch(bank._id, { currentBalance: bank.initialBalance ?? 0, updatedAt: Date.now() });

    return { deleted: { transactions: transactions.length, sessions: sessions.length, banksReset: banks.length } };
  },
});

export const wipeAll = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { membership } = await requireOrgAccess(ctx, args.orgId);
    if (membership.role !== "owner") {
      throw new Error("Acceso denegado: Solo el propietario puede realizar esta acción");
    }
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const s of sales) {
      await ctx.db.delete(s._id);
    }

    const orders = await ctx.db
      .query("work_orders")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const o of orders) {
      await ctx.db.delete(o._id);
    }

    const transactions = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_confirmedAt", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    const sessions = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    const banks = await ctx.db
      .query("banks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const bank of banks) {
      await ctx.db.patch(bank._id, {
        currentBalance: bank.initialBalance ?? 0,
        updatedAt: Date.now(),
      });
    }

    return {
      status: "success",
      deleted: {
        sales: sales.length,
        orders: orders.length,
        transactions: transactions.length,
        sessions: sessions.length,
        banksReset: banks.length,
      },
    };
  },
});
