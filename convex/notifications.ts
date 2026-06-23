import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgAccess } from "./access";

export type NotificationKind =
  | "orden_sin_iniciar"
  | "orden_lista"
  | "caja_abierta"
  | "compra_vencida"
  | "stock_bajo";

export type NotificationSeverity = "error" | "warning" | "info";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  description: string;
  href: string;
  triggeredAt: number;
};

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args): Promise<AppNotification[]> => {
    await requireOrgAccess(ctx, args.orgId);
    const now = Date.now();
    const notifications: AppNotification[] = [];

    // ── 1. Caja abierta sin cerrar (abierta en un día anterior) ──────────────
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const openSessions = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "open")
      )
      .collect();

    for (const session of openSessions) {
      if (session.openedAt < startOfToday.getTime()) {
        notifications.push({
          id: `caja-${session._id}`,
          kind: "caja_abierta",
          severity: "error",
          title: "Caja abierta sin cerrar",
          description: `La sesión de caja lleva abierta desde ${new Date(session.openedAt).toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "short" })}.`,
          href: "/finanzas",
          triggeredAt: session.openedAt,
        });
      }
    }

    // ── 2. Órdenes en recepción sin iniciar (>4h en Pendiente) ───────────────
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const pendingOrders = await ctx.db
      .query("work_orders")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "Pendiente")
      )
      .collect();

    for (const order of pendingOrders) {
      if (now - order.createdAt > FOUR_HOURS) {
        const client = await ctx.db.get(order.clientId);
        const elapsed = Math.floor((now - order.createdAt) / (60 * 60 * 1000));
        notifications.push({
          id: `orden-pendiente-${order._id}`,
          kind: "orden_sin_iniciar",
          severity: "warning",
          title: "Orden sin iniciar reparación",
          description: `${client?.name ?? "Cliente"} · Orden #${order.number ?? "S/N"} lleva ${elapsed}h en recepción sin iniciar.`,
          href: `/ordenes`,
          triggeredAt: order.createdAt,
        });
      }
    }

    // ── 3. Órdenes listas sin entregar ───────────────────────────────────────
    const readyOrders = await ctx.db
      .query("work_orders")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "Listo")
      )
      .collect();

    for (const order of readyOrders) {
      const client = await ctx.db.get(order.clientId);
      notifications.push({
        id: `orden-lista-${order._id}`,
        kind: "orden_lista",
        severity: "info",
        title: "Vehículo listo para entrega",
        description: `${client?.name ?? "Cliente"} · Orden #${order.number ?? "S/N"} está lista y esperando al cliente.`,
        href: `/ordenes`,
        triggeredAt: order.updatedAt,
      });
    }

    // ── 4. Compras vencidas o por vencer (≤7 días) ───────────────────────────
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const purchase of purchases) {
      if (purchase.paymentStatus === "Pagado") continue;
      if (!purchase.dueDate) continue;
      const msUntilDue = purchase.dueDate - now;
      if (msUntilDue > SEVEN_DAYS) continue;

      const isOverdue = msUntilDue < 0;
      const daysLabel = isOverdue
        ? `vencida hace ${Math.abs(Math.floor(msUntilDue / 86400000))} día(s)`
        : `vence en ${Math.ceil(msUntilDue / 86400000)} día(s)`;

      notifications.push({
        id: `compra-${purchase._id}`,
        kind: "compra_vencida",
        severity: isOverdue ? "error" : "warning",
        title: isOverdue ? "Compra vencida sin pagar" : "Compra por vencer",
        description: `${purchase.supplierName} · Factura ${purchase.number ?? "S/N"} — ${daysLabel}.`,
        href: "/compras",
        triggeredAt: purchase.dueDate,
      });
    }

    // ── 5. Stock bajo ─────────────────────────────────────────────────────────
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    for (const item of items) {
      if (item.minQuantity === undefined) continue;
      if (item.quantity > item.minQuantity) continue;
      if (item.status === "Inactivo") continue;

      notifications.push({
        id: `stock-${item._id}`,
        kind: "stock_bajo",
        severity: item.quantity === 0 ? "error" : "warning",
        title: item.quantity === 0 ? "Producto sin stock" : "Stock bajo",
        description: `${item.name} · ${item.quantity} unidades (mínimo: ${item.minQuantity}).`,
        href: "/inventario",
        triggeredAt: item.updatedAt,
      });
    }

    return notifications.sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.triggeredAt - a.triggeredAt
    );
  },
});
