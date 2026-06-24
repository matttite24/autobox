import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  organizations: defineTable({
    name: v.string(),
  }),

  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  organization_settings: defineTable({
    orgId: v.id("organizations"),
    commercialName: v.string(),
    fiscalName: v.optional(v.string()),
    ruc: v.optional(v.string()),
    address: v.optional(v.string()),
    contact: v.optional(v.string()),
    website: v.optional(v.string()),
    legalRepresentative: v.optional(v.string()),
    taxRate: v.number(),
    zeroTaxRate: v.number(),
    roundingMode: v.union(v.literal("none"), v.literal("nearest"), v.literal("up"), v.literal("down")),
    currency: v.string(),
    enabledPaymentMethods: v.array(
      v.union(v.literal("Efectivo"), v.literal("Tarjeta"), v.literal("Transferencia"))
    ),
    profitPlans: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        percentage: v.number(),
        rounding: v.union(v.literal("none"), v.literal("nearest"), v.literal("up"), v.literal("down")),
      })
    ),
    defaultProfitPlanId: v.optional(v.string()),
    orderTemplate: v.optional(v.string()),
    saleTemplate: v.optional(v.string()),
    templates: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      kind: v.union(v.literal("orden"), v.literal("cotizacion"), v.literal("venta"), v.literal("etiqueta"), v.literal("ticket"), v.literal("custom")),
      format: v.literal("html"),
      content: v.string(),
      updatedAt: v.number(),
    }))),
    blockTemplates: v.optional(v.string()),
    datilApiKey: v.optional(v.string()),
    datilCertPassword: v.optional(v.string()),
    datilAmbiente: v.optional(v.union(v.literal(1), v.literal(2))),
    datilEstablecimiento: v.optional(v.string()),
    datilPuntoEmision: v.optional(v.string()),
    datilObligadoContabilidad: v.optional(v.union(v.literal("SI"), v.literal("NO"))),
    allowNegativeStock: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_defaultProfitPlanId", ["orgId", "defaultProfitPlanId"]),

  cash_sessions: defineTable({
    orgId: v.id("organizations"),
    openingAmount: v.number(),
    openingDate: v.optional(v.number()),
    openedBy: v.optional(v.string()),
    openedAt: v.number(),
    closedAt: v.optional(v.number()),
    closingAmount: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("closed")),
  })
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_openedAt", ["orgId", "openedAt"]),

  finance_transactions: defineTable({
    orgId: v.id("organizations"),
    sessionId: v.optional(v.id("cash_sessions")),
    kind: v.union(
      v.literal("Cobro"),
      v.literal("Pago"),
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
    bankId: v.optional(v.id("banks")),
    paymentNetworkId: v.optional(v.id("payment_networks")),
    paymentId: v.optional(v.string()),
    grossAmount: v.optional(v.number()),
    commissionRate: v.optional(v.number()),
    commissionAmount: v.optional(v.number()),
    netAmount: v.optional(v.number()),
    groupId: v.optional(v.string()),
    amount: v.number(),
    description: v.string(),
    source: v.string(),
    sourceModule: v.optional(v.union(
      v.literal("ordenes"),
      v.literal("ventas"),
      v.literal("compras"),
      v.literal("nomina"),
      v.literal("manual")
    )),
    sourceId: v.optional(v.string()),
    workerId: v.optional(v.id("clients")),
    confirmedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.union(v.literal("Confirmada"), v.literal("Anulada")),
  })
    .index("by_org_and_confirmedAt", ["orgId", "confirmedAt"])
    .index("by_org_and_sessionId", ["orgId", "sessionId"])
    .index("by_org_and_sourceModule", ["orgId", "sourceModule"]),

  payment_networks: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    alias: v.optional(v.string()),
    commissionRate: v.number(),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
    currentBalance: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_status", ["orgId", "status"]),

  banks: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    initialBalance: v.optional(v.number()),
    currentBalance: v.number(),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_status", ["orgId", "status"]),

  clients: defineTable({
    orgId: v.id("organizations"),
    type: v.optional(v.union(
      v.literal("Cliente"),
      v.literal("Proveedor"),
      v.literal("Trabajador")
    )),
    name: v.string(),
    documentId: v.optional(v.string()), // RUC/CI
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    baseSalary: v.optional(v.number()),
    employmentStatus: v.optional(v.union(v.literal("Activo"), v.literal("Inactivo"))),
    hireDate: v.optional(v.number()),
    jobTitle: v.optional(v.string()),
    employmentNotes: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_type", ["orgId", "type"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["orgId"] }),

  payroll_runs: defineTable({
    orgId: v.id("organizations"),
    periodYear: v.number(),
    periodMonth: v.number(),
    name: v.string(),
    status: v.union(v.literal("Borrador"), v.literal("Confirmado"), v.literal("Pagado"), v.literal("Anulado")),
    totalSalary: v.number(),
    totalIncome: v.number(),
    totalManualDeductions: v.number(),
    totalAdvances: v.number(),
    totalNet: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    confirmedAt: v.optional(v.number()),
    annulledAt: v.optional(v.number()),
    annulReason: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_periodYear_and_periodMonth", ["orgId", "periodYear", "periodMonth"])
    .index("by_org_and_status", ["orgId", "status"]),

  payroll_payments: defineTable({
    orgId: v.id("organizations"),
    runId: v.id("payroll_runs"),
    workerId: v.id("clients"),
    workerName: v.string(),
    salaryAmount: v.number(),
    incomeAmount: v.number(),
    manualDeductionAmount: v.number(),
    advanceAmount: v.number(),
    netAmount: v.number(),
    status: v.union(v.literal("Borrador"), v.literal("Confirmado"), v.literal("Pagado"), v.literal("Anulado")),
    notes: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    paymentMethod: v.optional(v.union(v.literal("Efectivo"), v.literal("Banco"), v.literal("Transferencia"))),
    bankId: v.optional(v.id("banks")),
    reference: v.optional(v.string()),
    financeTransactionId: v.optional(v.id("finance_transactions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_runId", ["runId"])
    .index("by_workerId", ["workerId"])
    .index("by_runId_and_workerId", ["runId", "workerId"])
    .index("by_org_and_status", ["orgId", "status"]),

  payroll_adjustments: defineTable({
    orgId: v.id("organizations"),
    runId: v.id("payroll_runs"),
    paymentId: v.id("payroll_payments"),
    kind: v.union(v.literal("Ingreso"), v.literal("Descuento")),
    concept: v.string(),
    amount: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_runId", ["runId"])
    .index("by_paymentId", ["paymentId"]),

  payroll_payment_advances: defineTable({
    orgId: v.id("organizations"),
    runId: v.id("payroll_runs"),
    paymentId: v.id("payroll_payments"),
    workerId: v.id("clients"),
    advanceId: v.id("salary_advances"),
    amount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_runId", ["runId"])
    .index("by_paymentId", ["paymentId"])
    .index("by_advanceId", ["advanceId"])
    .index("by_paymentId_and_advanceId", ["paymentId", "advanceId"]),

  salary_advances: defineTable({
    orgId: v.id("organizations"),
    workerId: v.id("clients"),
    financeTransactionId: v.id("finance_transactions"),
    amount: v.number(),
    status: v.union(v.literal("Pendiente"), v.literal("Reservado"), v.literal("Aplicado"), v.literal("Anulado")),
    requestedAt: v.number(),
    reservedPayrollRunId: v.optional(v.id("payroll_runs")),
    appliedPayrollRunId: v.optional(v.id("payroll_runs")),
    appliedPayrollPaymentId: v.optional(v.id("payroll_payments")),
    appliedPeriodYear: v.optional(v.number()),
    appliedPeriodMonth: v.optional(v.number()),
    reservedAt: v.optional(v.number()),
    appliedAt: v.optional(v.number()),
    annulledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_workerId", ["workerId"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_financeTransactionId", ["financeTransactionId"]),
  vehicles: defineTable({
    orgId: v.id("organizations"),
    clientId: v.id("clients"),
    plate: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    vin: v.optional(v.string()),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_org", ["orgId"])
    .searchIndex("search_plate", { searchField: "plate", filterFields: ["orgId"] })
    .searchIndex("search_make", { searchField: "make", filterFields: ["orgId"] })
    .searchIndex("search_model", { searchField: "model", filterFields: ["orgId"] }),

  work_orders: defineTable({
    orgId: v.id("organizations"),
    number: v.optional(v.number()),
    clientId: v.id("clients"),
    vehicleId: v.optional(v.id("vehicles")), // Optional temporarily to avoid breaking old data
    vehicle: v.optional(v.string()), // Legacy field
    issue: v.optional(v.string()), // Legacy field
    symptoms: v.optional(v.string()),
    inspection: v.optional(v.string()),
    mileage: v.optional(v.number()),
    nextMileage: v.optional(v.number()),
    status: v.union(
      v.literal("Pendiente"),
      v.literal("En Progreso"),
      v.literal("Listo"),
      v.literal("Entregado"),
      v.literal("Completada"),
      v.literal("Cancelada")
    ),
    items: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(v.literal("part"), v.literal("labor"), v.literal("service")),
          description: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          total: v.number(),
          inventoryId: v.optional(v.id("inventory")),
        })
      )
    ),
    payments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          amount: v.number(),
          method: v.union(
            v.literal("Efectivo"),
            v.literal("Tarjeta"),
            v.literal("Transferencia")
          ),
          bankId: v.optional(v.id("banks")),
          networkId: v.optional(v.id("payment_networks")),
          date: v.number(),
          reference: v.optional(v.string()),
        })
      )
    ),
    facturacionStatus: v.optional(v.union(
      v.literal("pendiente"),
      v.literal("enviando"),
      v.literal("enviada"),
      v.literal("error")
    )),
    facturacionLabel: v.optional(v.string()),
    datilInvoiceId: v.optional(v.string()),
    datilInvoiceUrl: v.optional(v.string()),
    datilPdfUrl: v.optional(v.string()),
    datilXmlUrl: v.optional(v.string()),
    datilStatus: v.optional(v.string()),
    datilLastError: v.optional(v.string()),
    facturadaAt: v.optional(v.number()),
    facturacionAttempts: v.optional(v.number()),
    kind: v.optional(v.union(v.literal("orden"), v.literal("cotizacion"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_org", ["orgId"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_number", ["orgId", "number"])
    .index("by_org_and_kind", ["orgId", "kind"])
    .searchIndex("search_symptoms", { searchField: "symptoms", filterFields: ["orgId"] })
    .searchIndex("search_inspection", { searchField: "inspection", filterFields: ["orgId"] }),

  sales: defineTable({
    orgId: v.id("organizations"),
    number: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    clientName: v.string(),
    status: v.union(
      v.literal("Pendiente"),
      v.literal("Completada"),
      v.literal("Cancelada")
    ),
    items: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(v.literal("part"), v.literal("labor"), v.literal("service")),
          description: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          total: v.number(),
          inventoryId: v.optional(v.id("inventory")),
        })
      )
    ),
    payments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          amount: v.number(),
          method: v.union(
            v.literal("Efectivo"),
            v.literal("Tarjeta"),
            v.literal("Transferencia")
          ),
          bankId: v.optional(v.id("banks")),
          networkId: v.optional(v.id("payment_networks")),
          date: v.number(),
          reference: v.optional(v.string()),
        })
      )
    ),
    facturacionStatus: v.optional(v.union(
      v.literal("pendiente"),
      v.literal("enviando"),
      v.literal("enviada"),
      v.literal("error")
    )),
    facturacionLabel: v.optional(v.string()),
    datilInvoiceId: v.optional(v.string()),
    datilInvoiceUrl: v.optional(v.string()),
    datilPdfUrl: v.optional(v.string()),
    datilXmlUrl: v.optional(v.string()),
    datilStatus: v.optional(v.string()),
    datilLastError: v.optional(v.string()),
    facturadaAt: v.optional(v.number()),
    facturacionAttempts: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_client", ["clientId"])
    .index("by_org_number", ["orgId", "number"])
    .searchIndex("search_client_name", {
      searchField: "clientName",
      filterFields: ["orgId"],
    }),

  categories: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    parentId: v.optional(v.id("categories")),
  })
    .index("by_org", ["orgId"])
    .index("by_parent", ["orgId", "parentId"]),

  inventory: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    sku: v.optional(v.string()), // SKU visible
    code: v.string(), // Código interno
    description: v.optional(v.string()),
    categoryId: v.id("categories"), // Relación con tabla categories
    quantity: v.number(), // Stock actual
    minQuantity: v.optional(v.number()), // Alerta de stock bajo
    costPrice: v.optional(v.number()), // Costo de compra
    salePrice: v.number(), // Precio de venta al público
    supplier: v.optional(v.string()), // Proveedor (texto libre legado)
    supplierIds: v.optional(v.array(v.id("clients"))), // Proveedores vinculados
    location: v.optional(v.string()), // Ubicación física (Ej: Estante A1)
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_category", ["orgId", "categoryId"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["orgId"],
    }),

  services: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    billingType: v.union(v.literal("unit"), v.literal("hour")),
    salePrice: v.number(),
    costPrice: v.number(),
    status: v.union(v.literal("Activo"), v.literal("Inactivo")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_billingType", ["orgId", "billingType"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["orgId"],
    }),
  
  purchases: defineTable({
    orgId: v.id("organizations"),
    number: v.optional(v.string()), // Supplier invoice number
    supplierId: v.id("clients"), // Client type="Proveedor"
    supplierName: v.string(),
    status: v.union(v.literal("Borrador"), v.literal("Recibida"), v.literal("Cancelada")),
    paymentStatus: v.union(v.literal("Pendiente"), v.literal("Parcial"), v.literal("Pagado")),
    receivedAt: v.optional(v.number()),
    issueDate: v.number(),
    dueDate: v.optional(v.number()), // For credit purchases
    items: v.array(
      v.object({
        id: v.string(),
        inventoryId: v.optional(v.id("inventory")),
        description: v.string(),
        quantity: v.number(),
        unitCost: v.number(),
        total: v.number(),
      })
    ),
    payments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          amount: v.number(),
          method: v.union(
            v.literal("Efectivo"),
            v.literal("Tarjeta"),
            v.literal("Transferencia"),
            v.literal("Cheque")
          ),
          bankId: v.optional(v.id("banks")),
          networkId: v.optional(v.id("payment_networks")),
          date: v.number(),
          reference: v.optional(v.string()),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_supplier", ["supplierId"])
    .searchIndex("search_supplier_name", {
      searchField: "supplierName",
      filterFields: ["orgId"],
    }),

  facturacion_events: defineTable({
    orgId: v.id("organizations"),
    sourceType: v.union(v.literal("orden"), v.literal("venta")),
    sourceId: v.string(),
    status: v.union(v.literal("pendiente"), v.literal("enviando"), v.literal("enviada"), v.literal("error")),
    action: v.union(v.literal("request"), v.literal("retry"), v.literal("success"), v.literal("failure")),
    attempt: v.number(),
    message: v.optional(v.string()),
    datilInvoiceId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org_and_sourceType_and_sourceId", ["orgId", "sourceType", "sourceId"])
    .index("by_org_and_createdAt", ["orgId", "createdAt"]),
});
