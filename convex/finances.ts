import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgAccess, requireDocAccess } from "./access";

type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Cheque" | "Banco";

async function getOpenSessionId(ctx: MutationCtx, orgId: Id<"organizations">) {
  const session = await ctx.db
    .query("cash_sessions")
    .withIndex("by_org_and_status", (q) => q.eq("orgId", orgId).eq("status", "open"))
    .first();
  return session?._id ?? null;
}

async function adjustBankBalance(
  ctx: MutationCtx,
  bankId: Id<"banks">,
  delta: number,
) {
  const bank = await ctx.db.get(bankId);
  if (!bank) throw new Error("La cuenta bancaria no existe.");
  await ctx.db.patch(bankId, {
    currentBalance: (bank.currentBalance ?? bank.initialBalance ?? 0) + delta,
    updatedAt: Date.now(),
  });
}

async function adjustPaymentNetworkBalance(
  ctx: MutationCtx,
  networkId: Id<"payment_networks">,
  delta: number,
) {
  const network = await ctx.db.get(networkId);
  if (!network) throw new Error("La red de cobro no existe.");
  await ctx.db.patch(networkId, {
    currentBalance: (network.currentBalance ?? 0) + delta,
    updatedAt: Date.now(),
  });
}

async function recordMovement(
  ctx: MutationCtx,
  args: {
    orgId: Id<"organizations">;
    kind: "Cobro" | "Egreso" | "Liquidación";
    flow: "Ingreso" | "Salida";
    method: PaymentMethod;
    amount: number;
    description: string;
    source: string;
    sourceModule: "ordenes" | "ventas" | "compras";
    sourceId: string;
    paymentId: string;
    workerId?: Id<"clients">;
    bankId?: Id<"banks">;
    paymentNetworkId?: Id<"payment_networks">;
    grossAmount?: number;
    commissionRate?: number;
    commissionAmount?: number;
    netAmount?: number;
    groupId?: string;
    confirmedAt: number;
  },
) {
  const session = await ctx.db
    .query("cash_sessions")
    .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
    .first();

  if (args.method === "Efectivo" && !session) {
    throw new Error("No hay una caja diaria abierta para registrar movimientos en efectivo.");
  }

  if (args.method === "Efectivo") {
    if (!session) {
      throw new Error("No hay caja diaria abierta para registrar cobros en efectivo.");
    }
  }

  let grossAmount = args.grossAmount ?? args.amount;
  let commissionRate = args.commissionRate ?? 0;
  let commissionAmount = args.commissionAmount ?? 0;
  let netAmount = args.netAmount ?? args.amount;
  let storedAmount = args.amount;

  if (args.method === "Tarjeta") {
    if (!args.paymentNetworkId) {
      throw new Error("Debes seleccionar una red de cobro para registrar tarjeta.");
    }
    const network = await ctx.db.get(args.paymentNetworkId);
    if (!network) {
      throw new Error("La red de cobro no existe.");
    }
    commissionRate = network.commissionRate;
    grossAmount = args.grossAmount ?? args.amount;
    commissionAmount = args.commissionAmount ?? grossAmount * (commissionRate / 100);
    netAmount = args.netAmount ?? grossAmount - commissionAmount;
    storedAmount = netAmount;
  }

  const duplicate = await ctx.db
    .query("finance_transactions")
    .withIndex("by_org_and_sourceModule", (q) => q.eq("orgId", args.orgId).eq("sourceModule", args.sourceModule))
    .filter((q) => q.and(
      q.eq(q.field("paymentId"), args.paymentId),
      q.eq(q.field("sourceId"), args.sourceId),
      q.eq(q.field("status"), "Confirmada"),
      q.eq(q.field("description"), args.description),
      q.eq(q.field("amount"), storedAmount),
      q.eq(q.field("confirmedAt"), args.confirmedAt),
      q.eq(q.field("source"), args.source)
    ))
    .first();

  if (duplicate) {
    return duplicate._id;
  }

  const sessionId = session?._id ?? null;
  const now = Date.now();
  const txId = await ctx.db.insert("finance_transactions", {
    orgId: args.orgId,
    sessionId: sessionId ?? undefined,
    kind: args.kind,
    flow: args.flow,
    method: args.method === "Cheque" ? "Banco" : args.method,
    bankId: args.bankId,
    paymentNetworkId: args.paymentNetworkId,
    paymentId: args.paymentId,
    grossAmount,
    commissionRate,
    commissionAmount,
    netAmount,
    groupId: args.groupId ?? args.paymentId,
    amount: storedAmount,
    description: args.description,
    source: args.source,
    sourceModule: args.sourceModule,
    sourceId: args.sourceId,
    workerId: args.workerId,
    confirmedAt: args.confirmedAt,
    createdAt: now,
    updatedAt: now,
    status: "Confirmada",
  });

  if (args.bankId) {
    const delta = args.flow === "Ingreso" ? storedAmount : -storedAmount;
    await adjustBankBalance(ctx, args.bankId, delta);
  }

  if (args.paymentNetworkId && args.method === "Tarjeta") {
    await adjustPaymentNetworkBalance(ctx, args.paymentNetworkId, netAmount);
  }

  return txId;
}

async function recordPaymentNetworkLiquidation(
  ctx: MutationCtx,
  args: {
    orgId: Id<"organizations">;
    paymentNetworkId: Id<"payment_networks">;
    bankId: Id<"banks">;
    amount: number;
    description: string;
    confirmedAt: number;
  },
) {
  const network = await ctx.db.get(args.paymentNetworkId);
  if (!network) {
    throw new Error("La red de cobro no existe.");
  }
  if (network.status !== "Activo") {
    throw new Error("La red de cobro está inactiva.");
  }

  const bank = await ctx.db.get(args.bankId);
  if (!bank) {
    throw new Error("La cuenta bancaria no existe.");
  }

  const netAmount = Number(args.amount || 0);
  if (netAmount <= 0) {
    throw new Error("El monto a liquidar debe ser mayor a cero.");
  }

  const currentNetworkBalance = network.currentBalance ?? 0;
  if (netAmount > currentNetworkBalance) {
    throw new Error("No hay saldo suficiente en la red para liquidar ese monto.");
  }

  const now = Date.now();
  const paymentId = `liquidacion-${String(args.paymentNetworkId)}-${now}`;
  const commissionAmount = 0;
  const grossAmount = netAmount;

  const sessionId = await getOpenSessionId(ctx, args.orgId);
  const txId = await ctx.db.insert("finance_transactions", {
    orgId: args.orgId,
    sessionId: sessionId ?? undefined,
    kind: "Liquidación",
    flow: "Ingreso",
    method: "Banco",
    bankId: args.bankId,
    paymentNetworkId: args.paymentNetworkId,
    paymentId,
    grossAmount,
    commissionRate: network.commissionRate,
    commissionAmount,
    netAmount,
    groupId: paymentId,
    amount: netAmount,
    description: args.description,
    source: "Red de cobro",
    sourceModule: "manual",
    sourceId: String(args.paymentNetworkId),
    confirmedAt: args.confirmedAt,
    createdAt: now,
    updatedAt: now,
    status: "Confirmada",
  });

  await adjustPaymentNetworkBalance(ctx, args.paymentNetworkId, -netAmount);
  await adjustBankBalance(ctx, args.bankId, netAmount);

  return txId;
}

export const recordAutomaticPayment = mutation({
  args: {
    orgId: v.id("organizations"),
    kind: v.union(v.literal("Cobro"), v.literal("Egreso")),
    flow: v.union(v.literal("Ingreso"), v.literal("Salida")),
    method: v.union(
      v.literal("Efectivo"),
      v.literal("Tarjeta"),
      v.literal("Transferencia"),
      v.literal("Cheque"),
    ),
    amount: v.number(),
    description: v.string(),
    source: v.string(),
    sourceModule: v.union(v.literal("ordenes"), v.literal("ventas"), v.literal("compras")),
    sourceId: v.string(),
    paymentId: v.string(),
    bankId: v.optional(v.id("banks")),
    paymentNetworkId: v.optional(v.id("payment_networks")),
    grossAmount: v.optional(v.number()),
    commissionRate: v.optional(v.number()),
    commissionAmount: v.optional(v.number()),
    netAmount: v.optional(v.number()),
    groupId: v.optional(v.string()),
    confirmedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await recordMovement(ctx, args);
  },
});

export const liquidatePaymentNetwork = mutation({
  args: {
    orgId: v.id("organizations"),
    paymentNetworkId: v.id("payment_networks"),
    bankId: v.id("banks"),
    amount: v.number(),
    description: v.string(),
    confirmedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    return await recordPaymentNetworkLiquidation(ctx, args);
  },
});

export const getOpenCashSession = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const session = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
      .first();
    return session
      ? {
          _id: session._id,
          openingAmount: session.openingAmount,
          openingDate: session.openingDate,
          openedBy: session.openedBy,
          openedAt: session.openedAt,
          status: session.status,
        }
      : null;
  },
});

export const reverseTransaction = mutation({
  args: {
    transactionId: v.id("finance_transactions"),
  },
  handler: async (ctx, args) => {
    const { doc: tx } = await requireDocAccess(ctx, "finance_transactions", args.transactionId);
    if (!tx) throw new Error("Movimiento no encontrado.");
    if (tx.status === "Anulada") throw new Error("El movimiento ya fue anulado.");

    const duplicateReversal = await ctx.db
      .query("finance_transactions")
      .withIndex("by_org_and_sourceModule", (q) => q.eq("orgId", tx.orgId).eq("sourceModule", tx.sourceModule ?? "manual"))
      .filter((q) => q.and(
        q.eq(q.field("sourceId"), tx.sourceId),
        q.eq(q.field("description"), `Reversa de: ${tx.description}`),
        q.eq(q.field("amount"), tx.amount),
        q.neq(q.field("flow"), tx.flow),
        q.eq(q.field("status"), "Confirmada")
      ))
      .first();
    if (duplicateReversal) {
      await ctx.db.patch(args.transactionId, {
        status: "Anulada",
        updatedAt: Date.now(),
      });
      return duplicateReversal._id;
    }

    const now = Date.now();
    const sessionId = await getOpenSessionId(ctx, tx.orgId);
    const reversalFlow = tx.flow === "Ingreso" ? "Salida" : "Ingreso";
    const reversalId = await ctx.db.insert("finance_transactions", {
      orgId: tx.orgId,
      sessionId: sessionId ?? undefined,
      kind: tx.kind,
      flow: reversalFlow,
      method: tx.method,
      bankId: tx.bankId,
      paymentNetworkId: tx.paymentNetworkId,
      paymentId: tx.paymentId,
      amount: tx.amount,
      grossAmount: tx.grossAmount,
      commissionRate: tx.commissionRate,
      commissionAmount: tx.commissionAmount,
      netAmount: tx.netAmount,
      description: `Reversa de: ${tx.description}`,
      source: tx.source,
      sourceModule: tx.sourceModule,
      sourceId: tx.sourceId,
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
      status: "Confirmada",
    });

    await ctx.db.patch(args.transactionId, {
      status: "Anulada",
      updatedAt: now,
    });

    if (tx.bankId) {
      const delta = tx.flow === "Ingreso" ? -tx.amount : tx.amount;
      await adjustBankBalance(ctx, tx.bankId, delta);
    }

    if (tx.paymentNetworkId && tx.method === "Tarjeta") {
      const networkDelta = tx.flow === "Ingreso" ? -(tx.netAmount ?? tx.amount) : (tx.netAmount ?? tx.amount);
      await adjustPaymentNetworkBalance(ctx, tx.paymentNetworkId, networkDelta);
    }

    return reversalId;
  },
});

function isTruthy(value: unknown): boolean {
  return value !== undefined && value !== null;
}

export const getDashboard = query({
  args: {
    orgId: v.id("organizations"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const [session, manualTransactions, banks, paymentNetworks] = await Promise.all([
      ctx.db
        .query("cash_sessions")
        .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
        .first(),
      ctx.db
        .query("finance_transactions")
        .withIndex("by_org_and_confirmedAt", (q) => {
          if (args.from && args.to) return q.eq("orgId", args.orgId).gte("confirmedAt", args.from).lte("confirmedAt", args.to);
          if (args.from) return q.eq("orgId", args.orgId).gte("confirmedAt", args.from);
          if (args.to) return q.eq("orgId", args.orgId).lte("confirmedAt", args.to);
          return q.eq("orgId", args.orgId);
        })
        .order("desc")
        .collect(),
      ctx.db.query("banks").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect(),
      ctx.db.query("payment_networks").withIndex("by_org", (q) => q.eq("orgId", args.orgId)).collect(),
    ]);

    // Saldo real de caja: todas las transacciones de la sesión activa, sin filtro de fecha
    let sessionClosing = 0;
    if (session) {
      const sessionTxs = await ctx.db
        .query("finance_transactions")
        .withIndex("by_org_and_sessionId", (q) => q.eq("orgId", args.orgId).eq("sessionId", session._id))
        .collect();
      sessionClosing = sessionTxs
        .filter((tx) => tx.status === "Confirmada" && tx.method === "Efectivo")
        .reduce((sum, tx) => sum + (tx.flow === "Ingreso" ? tx.amount : -tx.amount), 0);
    }

    const bankNameById = new Map(banks.map((bank) => [String(bank._id), bank] as const));
    const paymentNetworkById = new Map(paymentNetworks.map((network) => [String(network._id), network] as const));

    const sourceTransactions = [
      ...manualTransactions
        .filter((tx) => tx.status === "Confirmada")
        .map((tx) => ({
          id: String(tx._id),
          kind: tx.kind,
          flow: tx.flow,
          method: tx.method,
          amount: tx.amount,
          description: tx.description,
          source: tx.source,
          sourceModule: tx.sourceModule ?? "manual",
          sourceId: tx.sourceId,
          bankId: tx.bankId ? String(tx.bankId) : undefined,
          bankName: tx.bankId ? bankNameById.get(String(tx.bankId))?.name : undefined,
          bankAccountNumber: tx.bankId ? bankNameById.get(String(tx.bankId))?.accountNumber : undefined,
          paymentNetworkId: tx.paymentNetworkId ? String(tx.paymentNetworkId) : undefined,
          paymentNetworkName: tx.paymentNetworkId ? paymentNetworkById.get(String(tx.paymentNetworkId))?.name : undefined,
          grossAmount: tx.grossAmount,
          commissionRate: tx.commissionRate,
          commissionAmount: tx.commissionAmount,
          netAmount: tx.netAmount,
          confirmedAt: tx.confirmedAt,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
          status: tx.status,
          color: "",
        })),
    ].filter(isTruthy);

    const transactions = sourceTransactions
      .sort((a, b) => b.confirmedAt - a.confirmedAt)
      .map((tx) => ({
        ...tx,
        color:
          tx.method === "Efectivo"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : tx.method === "Tarjeta"
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              : tx.method === "Transferencia"
                ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      }));

    const totals = transactions.reduce(
      (acc, tx) => {
        if (tx.flow === "Ingreso") acc.ingresos += tx.amount;
        if (tx.flow === "Salida") acc.gastos += tx.amount;
        if (tx.method === "Efectivo") acc.efectivo += tx.flow === "Ingreso" ? tx.amount : -tx.amount;
        if (tx.method === "Tarjeta") acc.tarjeta += tx.flow === "Ingreso" ? tx.amount : -tx.amount;
        if (tx.method === "Transferencia") acc.transferencia += tx.flow === "Ingreso" ? tx.amount : -tx.amount;
        if (tx.method === "Banco") acc.banco += tx.flow === "Ingreso" ? tx.amount : -tx.amount;
        return acc;
      },
      { efectivo: 0, tarjeta: 0, transferencia: 0, banco: 0, gastos: 0, ingresos: 0 },
    );

    const openingAmount = session?.openingAmount ?? 0;
    // closing usa el saldo real de la sesión (sin filtro de fecha) para que el widget
    // en inicio muestre el valor correcto aunque la caja haya abierto en un día anterior.
    const closing = session ? sessionClosing : totals.efectivo;

    return {
      session: session
        ? {
            _id: session._id,
            openingAmount: session.openingAmount,
            openingDate: session.openingDate,
            openedBy: session.openedBy,
            openedAt: session.openedAt,
            status: session.status,
          }
        : null,
      transactions,
      totals: {
        ...totals,
        closing,
        openingAmount,
      },
    };
  },
});

export const openCashSession = mutation({
  args: {
    orgId: v.id("organizations"),
    openingAmount: v.number(),
    openingDate: v.number(),
    openedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const existing = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
      .first();
    if (existing) throw new Error("Ya existe una caja abierta.");

    const now = Date.now();
    const sessionId = await ctx.db.insert("cash_sessions", {
      orgId: args.orgId,
      openingAmount: args.openingAmount,
      openingDate: args.openingDate,
      openedBy: args.openedBy,
      openedAt: now,
      status: "open",
    });

    if (args.openingAmount > 0) {
      await ctx.db.insert("finance_transactions", {
        orgId: args.orgId,
        sessionId,
        kind: "Ajuste",
        flow: "Ingreso",
        method: "Efectivo",
        amount: args.openingAmount,
        description: "Apertura de caja",
        source: "Caja diaria",
        sourceModule: "manual",
        sourceId: String(sessionId),
        confirmedAt: now,
        createdAt: now,
        updatedAt: now,
        status: "Confirmada",
      });
    }

    return sessionId;
  },
});

export const closeCashSession = mutation({
  args: {
    orgId: v.id("organizations"),
    closingAmount: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const session = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
      .first();
    if (!session) throw new Error("No hay una caja abierta.");

    const now = Date.now();

    // Registrar retiro del saldo final como egreso de efectivo
    if (args.closingAmount > 0) {
      await ctx.db.insert("finance_transactions", {
        orgId: args.orgId,
        sessionId: session._id,
        kind: "Egreso",
        flow: "Salida",
        method: "Efectivo",
        amount: args.closingAmount,
        description: "Retiro de caja al cierre",
        source: "Caja diaria",
        sourceModule: "manual",
        sourceId: String(session._id),
        confirmedAt: now,
        createdAt: now,
        updatedAt: now,
        status: "Confirmada",
      });
    }

    await ctx.db.patch(session._id, {
      closedAt: now,
      closingAmount: args.closingAmount,
      status: "closed",
    });
    return session._id;
  },
});

export const createTransaction = mutation({
  args: {
    orgId: v.id("organizations"),
    kind: v.union(
      v.literal("Cobro"),
      v.literal("Egreso"),
      v.literal("Anticipo"),
      v.literal("Liquidación"),
      v.literal("Movimiento bancario"),
      v.literal("Ajuste")
    ),
    flow: v.union(v.literal("Ingreso"), v.literal("Salida")),
    method: v.union(
      v.literal("Efectivo"),
      v.literal("Tarjeta"),
      v.literal("Transferencia"),
      v.literal("Banco")
    ),
    amount: v.number(),
    description: v.string(),
    source: v.string(),
    bankId: v.optional(v.id("banks")),
    workerId: v.optional(v.id("clients")),
    confirmedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    if (args.amount <= 0) throw new Error("El monto debe ser mayor a cero.");
    if (args.kind === "Anticipo" && !args.workerId) {
      throw new Error("Selecciona el trabajador del anticipo.");
    }
    if (args.kind === "Anticipo") {
      const worker = await ctx.db.get(args.workerId!);
      if (!worker || worker.orgId !== args.orgId || worker.type !== "Trabajador" || worker.employmentStatus !== "Activo") {
        throw new Error("Solo trabajadores activos pueden recibir anticipos.");
      }
    }
    const session = await ctx.db
      .query("cash_sessions")
      .withIndex("by_org_and_status", (q) => q.eq("orgId", args.orgId).eq("status", "open"))
      .first();
    if (args.method === "Efectivo" && !session) {
      throw new Error("No hay una caja diaria abierta para registrar movimientos en efectivo.");
    }
    if ((args.method === "Banco" || args.method === "Transferencia") && !args.bankId) {
      throw new Error("Selecciona una cuenta bancaria.");
    }
    const now = Date.now();
    const txId = await ctx.db.insert("finance_transactions", {
      orgId: args.orgId,
      sessionId: session?._id,
      kind: args.kind,
      flow: args.flow,
      method: args.method,
      amount: args.amount,
      description: args.description,
      source: args.source,
      sourceModule: args.kind === "Anticipo" ? "nomina" : "manual",
      sourceId: undefined,
      bankId: args.bankId,
      workerId: args.workerId,
      confirmedAt: args.confirmedAt ?? now,
      createdAt: now,
      updatedAt: now,
      status: "Confirmada",
    });

    if (args.kind === "Anticipo" && args.workerId) {
      await ctx.db.insert("salary_advances", {
        orgId: args.orgId,
        workerId: args.workerId,
        financeTransactionId: txId,
        amount: args.amount,
        status: "Pendiente",
        requestedAt: args.confirmedAt ?? now,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.bankId) {
      const delta = args.flow === "Ingreso" ? args.amount : -args.amount;
      await adjustBankBalance(ctx, args.bankId, delta);
    }

    return txId;
  },
});
