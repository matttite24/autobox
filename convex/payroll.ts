import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgAccess, requireDocAccess } from "./access";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function periodEnd(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999).getTime();
}

async function getOpenSessionId(ctx: MutationCtx, orgId: Id<"organizations">) {
  const session = await ctx.db
    .query("cash_sessions")
    .withIndex("by_org_and_status", (q) => q.eq("orgId", orgId).eq("status", "open"))
    .first();
  return session?._id ?? null;
}

async function adjustBankBalance(ctx: MutationCtx, bankId: Id<"banks">, delta: number) {
  const bank = await ctx.db.get(bankId);
  if (!bank) throw new Error("La cuenta bancaria no existe.");
  await ctx.db.patch(bankId, {
    currentBalance: (bank.currentBalance ?? bank.initialBalance ?? 0) + delta,
    updatedAt: Date.now(),
  });
}

async function recalcRun(ctx: MutationCtx, runId: Id<"payroll_runs">) {
  const payments = await ctx.db.query("payroll_payments").withIndex("by_runId", (q) => q.eq("runId", runId)).collect();
  const totals = payments.reduce(
    (acc, payment) => {
      acc.totalSalary += payment.salaryAmount;
      acc.totalIncome += payment.incomeAmount;
      acc.totalManualDeductions += payment.manualDeductionAmount;
      acc.totalAdvances += payment.advanceAmount;
      acc.totalNet += payment.netAmount;
      return acc;
    },
    { totalSalary: 0, totalIncome: 0, totalManualDeductions: 0, totalAdvances: 0, totalNet: 0 },
  );
  await ctx.db.patch(runId, {
    totalSalary: roundMoney(totals.totalSalary),
    totalIncome: roundMoney(totals.totalIncome),
    totalManualDeductions: roundMoney(totals.totalManualDeductions),
    totalAdvances: roundMoney(totals.totalAdvances),
    totalNet: roundMoney(totals.totalNet),
    updatedAt: Date.now(),
  });
}

async function recalcPayment(ctx: MutationCtx, paymentId: Id<"payroll_payments">) {
  const payment = await ctx.db.get(paymentId);
  if (!payment) throw new Error("Pago no encontrado.");
  const advanceLinks = await ctx.db
    .query("payroll_payment_advances")
    .withIndex("by_paymentId", (q) => q.eq("paymentId", paymentId))
    .collect();
  const adjustments = await ctx.db.query("payroll_adjustments").withIndex("by_paymentId", (q) => q.eq("paymentId", paymentId)).collect();
  const incomeAmount = roundMoney(adjustments.filter((a) => a.kind === "Ingreso").reduce((sum, a) => sum + a.amount, 0));
  const manualDeductionAmount = roundMoney(adjustments.filter((a) => a.kind === "Descuento").reduce((sum, a) => sum + a.amount, 0));
  const advanceAmount = roundMoney(advanceLinks.reduce((sum, link) => sum + link.amount, 0));
  const netAmount = roundMoney(payment.salaryAmount + incomeAmount - manualDeductionAmount - advanceAmount);
  await ctx.db.patch(paymentId, {
    incomeAmount,
    manualDeductionAmount,
    advanceAmount,
    netAmount,
    updatedAt: Date.now(),
  });
  await recalcRun(ctx, payment.runId);
}

async function createPaymentForWorker(
  ctx: MutationCtx,
  run: { _id: Id<"payroll_runs">; orgId: Id<"organizations"> },
  workerId: Id<"clients">,
) {
  const worker = await ctx.db.get(workerId);
  if (!worker || worker.orgId !== run.orgId || worker.type !== "Trabajador" || worker.employmentStatus !== "Activo") {
    throw new Error("Solo trabajadores activos pueden agregarse a nómina.");
  }
  const existing = await ctx.db
    .query("payroll_payments")
    .withIndex("by_runId_and_workerId", (q) => q.eq("runId", run._id).eq("workerId", workerId))
    .first();
  if (existing) throw new Error("El trabajador ya está en este lote.");
  const now = Date.now();
  const salaryAmount = roundMoney(worker.baseSalary ?? 0);
  return await ctx.db.insert("payroll_payments", {
    orgId: run.orgId,
    runId: run._id,
    workerId,
    workerName: worker.name,
    salaryAmount,
    incomeAmount: 0,
    manualDeductionAmount: 0,
    advanceAmount: 0,
    netAmount: roundMoney(salaryAmount),
    status: "Borrador",
    createdAt: now,
    updatedAt: now,
  });
}

export const listRuns = query({
  args: { orgId: v.id("organizations"), year: v.optional(v.number()), status: v.optional(v.union(v.literal("Borrador"), v.literal("Confirmado"), v.literal("Pagado"), v.literal("Anulado"))) },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    let runs = [];
    if (args.year) {
      runs = await ctx.db.query("payroll_runs")
        .withIndex("by_org_and_periodYear_and_periodMonth", (q) => q.eq("orgId", args.orgId).eq("periodYear", args.year!))
        .order("desc")
        .collect();
    } else {
      runs = await ctx.db.query("payroll_runs")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .collect();
    }
    if (args.status) runs = runs.filter((run) => run.status === args.status);
    return runs;
  },
});

export const getRunDetails = query({
  args: { runId: v.id("payroll_runs") },
  handler: async (ctx, args) => {
    const { doc: run } = await requireDocAccess(ctx, "payroll_runs", args.runId);
    if (!run) return null;
    const [payments, adjustments, advances, banks] = await Promise.all([
      ctx.db.query("payroll_payments").withIndex("by_runId", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("payroll_adjustments").withIndex("by_runId", (q) => q.eq("runId", args.runId)).collect(),
      ctx.db.query("salary_advances").withIndex("by_org", (q) => q.eq("orgId", run.orgId)).collect(),
      ctx.db.query("banks").withIndex("by_org", (q) => q.eq("orgId", run.orgId)).collect(),
    ]);
    const advanceLinks = await ctx.db.query("payroll_payment_advances").withIndex("by_runId", (q) => q.eq("runId", args.runId)).collect();
    const advanceTxIds = advances.map((advance) => advance.financeTransactionId);
    const txs = await Promise.all(advanceTxIds.map((id) => ctx.db.get(id)));
    const txById = new Map(txs.filter(Boolean).map((tx) => [String(tx!._id), tx!] as const));
    const periodEndTs = periodEnd(run.periodYear, run.periodMonth);
    return {
      run,
      payments: payments
        .map((payment) => ({
          ...payment,
          adjustments: adjustments.filter((a) => String(a.paymentId) === String(payment._id)),
          advances: advances
            .filter(
              (a) =>
                String(a.workerId) === String(payment.workerId) &&
                a.requestedAt <= periodEndTs &&
                a.status !== "Anulado",
            )
            .map((advance) => ({
              ...advance,
              selected: advanceLinks.some((link) => String(link.paymentId) === String(payment._id) && String(link.advanceId) === String(advance._id)),
              transaction: txById.get(String(advance.financeTransactionId)) ?? null,
            })),
        }))
        .sort((a, b) => a.status.localeCompare(b.status) || a.workerName.localeCompare(b.workerName)),
      banks,
    };
  },
});

export const createRun = mutation({
  args: { orgId: v.id("organizations"), periodYear: v.number(), periodMonth: v.number() },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);
    const existing = await ctx.db
      .query("payroll_runs")
      .withIndex("by_org_and_periodYear_and_periodMonth", (q) => q.eq("orgId", args.orgId).eq("periodYear", args.periodYear).eq("periodMonth", args.periodMonth))
      .collect();
    if (existing.some((run) => run.status !== "Anulado")) throw new Error("Ya existe una nómina para este período.");
    const workers = (await ctx.db.query("clients").withIndex("by_org_and_type", (q) => q.eq("orgId", args.orgId).eq("type", "Trabajador")).collect()).filter(
      (client) => client.employmentStatus === "Activo",
    );
    const now = Date.now();
    const runId = await ctx.db.insert("payroll_runs", {
      orgId: args.orgId,
      periodYear: args.periodYear,
      periodMonth: args.periodMonth,
      name: `Nómina ${MONTHS[args.periodMonth - 1]} ${args.periodYear}`,
      status: "Borrador",
      totalSalary: 0,
      totalIncome: 0,
      totalManualDeductions: 0,
      totalAdvances: 0,
      totalNet: 0,
      createdAt: now,
      updatedAt: now,
    });
    const run = { _id: runId, orgId: args.orgId };
    for (const worker of workers) {
      await createPaymentForWorker(ctx, run, worker._id);
    }
    await recalcRun(ctx, runId);
    return runId;
  },
});

export const addWorker = mutation({
  args: { runId: v.id("payroll_runs"), workerId: v.id("clients") },
  handler: async (ctx, args) => {
    const { doc: run } = await requireDocAccess(ctx, "payroll_runs", args.runId);
    if (!run) throw new Error("Lote no encontrado.");
    if (run.status !== "Borrador") throw new Error("Solo se puede agregar trabajadores en borrador.");
    const id = await createPaymentForWorker(ctx, { _id: run._id, orgId: run.orgId }, args.workerId);
    await recalcRun(ctx, run._id);
    return id;
  },
});

export const toggleAdvanceSelection = mutation({
  args: {
    paymentId: v.id("payroll_payments"),
    advanceId: v.id("salary_advances"),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Borrador") throw new Error("Solo se puede editar en borrador.");
    const advance = await ctx.db.get(args.advanceId);
    if (!advance || String(advance.orgId) !== String(payment.orgId) || String(advance.workerId) !== String(payment.workerId)) {
      throw new Error("Anticipo no válido para este trabajador.");
    }
    if (advance.status === "Anulado") throw new Error("El anticipo está anulado.");
    if (args.selected && advance.status !== "Pendiente") throw new Error("Solo se pueden cargar anticipos pendientes.");
    const existing = await ctx.db
      .query("payroll_payment_advances")
      .withIndex("by_paymentId_and_advanceId", (q) => q.eq("paymentId", payment._id).eq("advanceId", advance._id))
      .first();
    if (args.selected) {
      if (existing) return existing._id;
      const id = await ctx.db.insert("payroll_payment_advances", {
        orgId: payment.orgId,
        runId: run._id,
        paymentId: payment._id,
        workerId: payment.workerId,
        advanceId: advance._id,
        amount: roundMoney(advance.amount),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await recalcPayment(ctx, payment._id);
      return id;
    }
    if (existing) await ctx.db.delete(existing._id);
    await recalcPayment(ctx, payment._id);
    return existing?._id ?? null;
  },
});

export const removePayment = mutation({
  args: { paymentId: v.id("payroll_payments") },
  handler: async (ctx, args) => {
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Borrador") throw new Error("Solo se puede quitar trabajadores en borrador.");
    const adjustments = await ctx.db.query("payroll_adjustments").withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id)).collect();
    for (const adjustment of adjustments) await ctx.db.delete(adjustment._id);
    await ctx.db.delete(payment._id);
    await recalcRun(ctx, run._id);
  },
});

export const updatePayment = mutation({
  args: { paymentId: v.id("payroll_payments"), salaryAmount: v.number(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Borrador") throw new Error("Solo se puede editar en borrador.");
    await ctx.db.patch(payment._id, { salaryAmount: roundMoney(args.salaryAmount), notes: args.notes, updatedAt: Date.now() });
    await recalcPayment(ctx, payment._id);
  },
});

export const addAdjustment = mutation({
  args: { paymentId: v.id("payroll_payments"), kind: v.union(v.literal("Ingreso"), v.literal("Descuento")), concept: v.string(), amount: v.number(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("El monto debe ser mayor a cero.");
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Borrador") throw new Error("Solo se puede editar en borrador.");
    await ctx.db.insert("payroll_adjustments", {
      orgId: payment.orgId,
      runId: payment.runId,
      paymentId: payment._id,
      kind: args.kind,
      concept: args.concept.trim(),
      amount: roundMoney(args.amount),
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await recalcPayment(ctx, payment._id);
  },
});

export const deleteAdjustment = mutation({
  args: { adjustmentId: v.id("payroll_adjustments") },
  handler: async (ctx, args) => {
    const { doc: adjustment } = await requireDocAccess(ctx, "payroll_adjustments", args.adjustmentId);
    if (!adjustment) return;
    const run = await ctx.db.get(adjustment.runId);
    if (!run || run.status !== "Borrador") throw new Error("Solo se puede editar en borrador.");
    await ctx.db.delete(adjustment._id);
    await recalcPayment(ctx, adjustment.paymentId);
  },
});

export const confirmRun = mutation({
  args: { runId: v.id("payroll_runs") },
  handler: async (ctx, args) => {
    const { doc: run } = await requireDocAccess(ctx, "payroll_runs", args.runId);
    if (!run) throw new Error("Lote no encontrado.");
    if (run.status !== "Borrador") throw new Error("Solo se puede confirmar un borrador.");
    const payments = await ctx.db.query("payroll_payments").withIndex("by_runId", (q) => q.eq("runId", run._id)).collect();
    if (!payments.length) throw new Error("La nómina no tiene trabajadores.");
    for (const payment of payments) {
      const selectedAdvances = await ctx.db
        .query("payroll_payment_advances")
        .withIndex("by_paymentId", (q) => q.eq("paymentId", payment._id))
        .collect();
      const advanceAmount = roundMoney(selectedAdvances.reduce((sum, item) => sum + item.amount, 0));
      const netAmount = roundMoney(payment.salaryAmount + payment.incomeAmount - payment.manualDeductionAmount - advanceAmount);
      if (payment.salaryAmount + payment.incomeAmount <= 0) throw new Error(`${payment.workerName} no tiene sueldo ni ingresos.`);
      if (netAmount < 0) throw new Error(`Anticipos superan neto disponible para ${payment.workerName}.`);
      await ctx.db.patch(payment._id, { advanceAmount, netAmount, status: "Confirmado", updatedAt: Date.now() });
      for (const advanceLink of selectedAdvances) {
        const advance = await ctx.db.get(advanceLink.advanceId);
        if (!advance || advance.status === "Anulado") throw new Error("Anticipo inválido.");
        await ctx.db.patch(advance._id, {
          status: "Reservado",
          reservedPayrollRunId: run._id,
          reservedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    await ctx.db.patch(run._id, { status: "Confirmado", confirmedAt: Date.now(), updatedAt: Date.now() });
    await recalcRun(ctx, run._id);
  },
});

export const payPayment = mutation({
  args: {
    paymentId: v.id("payroll_payments"),
    method: v.optional(v.union(v.literal("Efectivo"), v.literal("Banco"), v.literal("Transferencia"))),
    bankId: v.optional(v.id("banks")),
    reference: v.optional(v.string()),
    paidAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Confirmado") throw new Error("Solo se puede pagar un lote confirmado.");
    if (payment.status !== "Confirmado") throw new Error("Este pago no está pendiente.");
    let financeTransactionId: Id<"finance_transactions"> | undefined;
    if (payment.netAmount > 0) {
      if (!args.method) throw new Error("Selecciona método de pago.");
      const sessionId = await getOpenSessionId(ctx, payment.orgId);
      if (args.method === "Efectivo" && !sessionId) throw new Error("No hay una caja diaria abierta para registrar pagos en efectivo.");
      if ((args.method === "Banco" || args.method === "Transferencia") && !args.bankId) throw new Error("Selecciona una cuenta bancaria.");
      financeTransactionId = await ctx.db.insert("finance_transactions", {
        orgId: payment.orgId,
        sessionId: sessionId ?? undefined,
        kind: "Egreso",
        flow: "Salida",
        method: args.method,
        bankId: args.bankId,
        paymentId: `nomina-${String(payment._id)}`,
        amount: payment.netAmount,
        grossAmount: payment.netAmount,
        netAmount: payment.netAmount,
        description: `Pago nómina - ${payment.workerName} - ${run.name}`,
        source: "Nómina",
        sourceModule: "nomina",
        sourceId: String(payment._id),
        workerId: payment.workerId,
        confirmedAt: args.paidAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "Confirmada",
      });
      if (args.bankId) await adjustBankBalance(ctx, args.bankId, -payment.netAmount);
    }
    await ctx.db.patch(payment._id, {
      status: "Pagado",
      paidAt: args.paidAt,
      paymentMethod: args.method,
      bankId: args.bankId,
      reference: args.reference?.trim() || undefined,
      financeTransactionId,
      updatedAt: Date.now(),
    });
    const advances = await ctx.db.query("salary_advances").withIndex("by_org_and_status", (q) => q.eq("orgId", payment.orgId).eq("status", "Reservado")).collect();
    for (const advance of advances.filter((advance) => String(advance.reservedPayrollRunId) === String(run._id) && String(advance.workerId) === String(payment.workerId))) {
      await ctx.db.patch(advance._id, {
        status: "Aplicado",
        appliedPayrollRunId: run._id,
        appliedPayrollPaymentId: payment._id,
        appliedPeriodYear: run.periodYear,
        appliedPeriodMonth: run.periodMonth,
        appliedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    const payments = await ctx.db.query("payroll_payments").withIndex("by_runId", (q) => q.eq("runId", run._id)).collect();
    if (payments.every((item) => item._id === payment._id || item.status === "Pagado")) {
      await ctx.db.patch(run._id, { status: "Pagado", updatedAt: Date.now() });
    }
  },
});

export const undoPaidPayment = mutation({
  args: { paymentId: v.id("payroll_payments") },
  handler: async (ctx, args) => {
    const { doc: payment } = await requireDocAccess(ctx, "payroll_payments", args.paymentId);
    if (!payment) throw new Error("Pago no encontrado.");
    const run = await ctx.db.get(payment.runId);
    if (!run || run.status !== "Confirmado") throw new Error("No se puede anular pagos de un lote cerrado.");
    if (payment.status !== "Pagado") throw new Error("El pago no está pagado.");
    if (payment.financeTransactionId) {
      const tx = await ctx.db.get(payment.financeTransactionId);
      if (tx && tx.status === "Confirmada") {
        await ctx.db.patch(tx._id, { status: "Anulada", updatedAt: Date.now() });
        if (tx.bankId) await adjustBankBalance(ctx, tx.bankId, tx.amount);
      }
    }
    const advances = await ctx.db.query("salary_advances").withIndex("by_workerId", (q) => q.eq("workerId", payment.workerId)).collect();
    for (const advance of advances.filter((advance) => String(advance.appliedPayrollPaymentId) === String(payment._id))) {
      await ctx.db.patch(advance._id, {
        status: "Reservado",
        appliedPayrollRunId: undefined,
        appliedPayrollPaymentId: undefined,
        appliedPeriodYear: undefined,
        appliedPeriodMonth: undefined,
        appliedAt: undefined,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.patch(payment._id, {
      status: "Confirmado",
      paidAt: undefined,
      paymentMethod: undefined,
      bankId: undefined,
      reference: undefined,
      financeTransactionId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const annulRun = mutation({
  args: { runId: v.id("payroll_runs"), reason: v.string() },
  handler: async (ctx, args) => {
    const { doc: run } = await requireDocAccess(ctx, "payroll_runs", args.runId);
    if (!run) throw new Error("Lote no encontrado.");
    if (run.status === "Pagado") throw new Error("No se puede anular un lote pagado.");
    if (!args.reason.trim()) throw new Error("El motivo es obligatorio.");
    const payments = await ctx.db.query("payroll_payments").withIndex("by_runId", (q) => q.eq("runId", run._id)).collect();
    if (payments.some((payment) => payment.status === "Pagado")) throw new Error("Anula pagos individuales antes de anular el lote.");
    const advanceLinks = await ctx.db.query("payroll_payment_advances").withIndex("by_runId", (q) => q.eq("runId", run._id)).collect();
    const advances = await ctx.db.query("salary_advances").withIndex("by_org_and_status", (q) => q.eq("orgId", run.orgId).eq("status", "Reservado")).collect();
    for (const advance of advances.filter((advance) => String(advance.reservedPayrollRunId) === String(run._id))) {
      await ctx.db.patch(advance._id, {
        status: "Pendiente",
        reservedPayrollRunId: undefined,
        reservedAt: undefined,
        updatedAt: Date.now(),
      });
    }
    for (const payment of payments) await ctx.db.patch(payment._id, { status: "Anulado", updatedAt: Date.now() });
    for (const link of advanceLinks) await ctx.db.delete(link._id);
    await ctx.db.patch(run._id, { status: "Anulado", annulReason: args.reason.trim(), annulledAt: Date.now(), updatedAt: Date.now() });
  },
});
