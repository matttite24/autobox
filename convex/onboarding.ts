import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess } from "./access";

export const getStatus = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const [client, product, purchase, bank, cashSession] = await Promise.all([
      ctx.db
        .query("clients")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .first(),
      ctx.db
        .query("inventory")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .first(),
      ctx.db
        .query("purchases")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .first(),
      ctx.db
        .query("banks")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .first(),
      ctx.db
        .query("cash_sessions")
        .withIndex("by_org_and_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", "open")
        )
        .first(),
    ]);

    return {
      hasClient: client !== null,
      hasProduct: product !== null,
      hasPurchase: purchase !== null,
      hasBank: bank !== null,
      hasCashSession: cashSession !== null,
    };
  },
});
