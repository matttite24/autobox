"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { api } from "@convex/_generated/api";
import { type Id } from "@convex/_generated/dataModel";
import { useOrg } from "@/components/providers/org-provider";
import { useQuery, useMutation } from "convex/react";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { toastManager } from "@/components/ui/toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar1,
  Plus,
} from "lucide-react";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { useDebounce } from "@/hooks/use-debounce";
import PresetCalendar from "@/components/p-calendar-21";
import { TransactionDetailsSheet } from "@/components/finanzas/transaction-details-sheet";
import { Calendar } from "@/components/ui/calendar";

type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Banco";
type TransactionKind = "Cobro" | "Egreso" | "Anticipo" | "Liquidación" | "Movimiento bancario" | "Ajuste" | "Pago" | "Gasto";


type FinanceTransaction = {
  id: string;
  kind: TransactionKind;
  flow: "Ingreso" | "Salida";
  method: "Efectivo" | "Tarjeta" | "Transferencia" | "Banco";
  bankId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  paymentNetworkId?: string;
  paymentNetworkName?: string;
  grossAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  netAmount?: number;
  amount: number;
  description: string;
  source: string;
  sourceModule?: "ordenes" | "ventas" | "compras" | "manual";
  sourceId?: string;
  confirmedAt: number;
  status: "Confirmada" | "Anulada";
  color: string;
};

type BankItem = {
  _id: string;
  name: string;
  bankName?: string;
  accountNumber?: string;
  initialBalance?: number;
  currentBalance: number;
  status: "Activo" | "Inactivo";
};

type PaymentNetworkItem = {
  _id: string;
  name: string;
  alias?: string;
  commissionRate: number;
  currentBalance: number;
  status: "Activo" | "Inactivo";
};

const KIND_COLORS: Record<TransactionKind, string> = {
  Cobro: "border-emerald-500/30 bg-emerald-500/8",
  Egreso: "border-rose-500/30 bg-rose-500/8",
  Anticipo: "border-orange-500/30 bg-orange-500/8",
  Pago: "border-rose-500/30 bg-rose-500/8",
  Gasto: "border-rose-500/30 bg-rose-500/8",
  "Liquidación": "border-cyan-500/30 bg-cyan-500/8",
  "Movimiento bancario": "border-amber-500/30 bg-amber-500/8",
  Ajuste: "border-zinc-500/30 bg-zinc-500/8",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function methodLabel(method: PaymentMethod | "Banco") {
  return method === "Banco" ? "Banco" : method;
}

export default function FinanzasPage() {
  const { orgId } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return { from, to };
  });
  const [cashDrawer, setCashDrawer] = useState(false);
  const [closeCashDrawer, setCloseCashDrawer] = useState(false);
  const [movementDrawer, setMovementDrawer] = useState(false);
  const [movementMode, setMovementMode] = useState<"Egreso" | "Ingreso" | "Anticipo" | "Liquidación">("Egreso");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openedBy, setOpenedBy] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDescription, setMovementDescription] = useState("");
  const [movementSource, setMovementSource] = useState("Caja diaria");
  const [movementBankId, setMovementBankId] = useState("");
  const [movementWorkerId, setMovementWorkerId] = useState("");
  const [movementPaymentNetworkId, setMovementPaymentNetworkId] = useState("");
  const [movementLiquidationBankId, setMovementLiquidationBankId] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedPaymentNetworkId, setSelectedPaymentNetworkId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const banks = useQuery(api.banks.get, orgId ? { orgId } : "skip") as BankItem[] | undefined;
  const workers = useQuery(api.clients.get, orgId ? { orgId, type: "Trabajador" } : "skip") as
    | { _id: string; name: string; employmentStatus?: "Activo" | "Inactivo" }[]
    | undefined;
  const paymentNetworks = useQuery(api.payment_networks.get, orgId ? { orgId } : "skip") as
    | PaymentNetworkItem[]
    | undefined;
  const dashboard = useQuery(
    api.finances.getDashboard,
    orgId && dateRange?.from && dateRange?.to
      ? {
          orgId,
          from: new Date(dateRange.from).setHours(0, 0, 0, 0),
          to: new Date(dateRange.to).setHours(23, 59, 59, 999),
        }
      : orgId
        ? { orgId }
        : "skip",
  );
  const openCashSession = useMutation(api.finances.openCashSession);
  const closeCashSession = useMutation(api.finances.closeCashSession);
  const createTransaction = useMutation(api.finances.createTransaction);
  const liquidatePaymentNetwork = useMutation(api.finances.liquidatePaymentNetwork);

  useNewShortcut(() => {
    setMovementMode("Egreso");
    setMovementSource("Caja diaria");
    setMovementDrawer(true);
  });

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    queueMicrotask(() => setMovementDrawer(true));
    router.replace("/finanzas", { scroll: false });
  }, [router, searchParams]);

  const transactions = useMemo(
    () => (dashboard?.transactions ?? []) as FinanceTransaction[],
    [dashboard?.transactions],
  );

  const filteredTransactions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      const matchesSource =
        !selectedSource ||
        (selectedSource === "Caja diaria"
          ? tx.method === "Efectivo" || tx.source === "Caja diaria"
          : tx.source === selectedSource);
      const matchesBank =
        !selectedBankId ||
        (tx.bankId ? String(tx.bankId) === selectedBankId : false);
      const matchesPaymentNetwork =
        !selectedPaymentNetworkId ||
        (tx.paymentNetworkId ? String(tx.paymentNetworkId) === selectedPaymentNetworkId : false);
      const matchesText =
        !query ||
        [tx.description, tx.source, tx.kind, tx.method, tx.sourceModule ?? ""]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      return matchesSource && matchesBank && matchesPaymentNetwork && matchesText;
    });
  }, [debouncedSearch, selectedBankId, selectedPaymentNetworkId, selectedSource, transactions]);

  const { page, setPage, totalPages, paginatedItems: pagedTransactions, total } = usePagination(filteredTransactions, 30);

  const summary = dashboard?.totals ?? {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    banco: 0,
    gastos: 0,
    ingresos: 0,
    closing: 0,
    openingAmount: 0,
  };

  const cashSessionState = dashboard?.session
    ? {
        open: dashboard.session.status === "open",
        openingDate: dashboard.session.openingDate,
        openedBy: dashboard.session.openedBy,
        openedAt: dashboard.session.openedAt,
        openingAmount: dashboard.session.openingAmount,
      }
    : { open: false, openingAmount: 0 };

  const selectedTransaction = transactions.find((tx) => tx.id === selectedTransactionId) ?? null;
  const bankNameById = useMemo(() => {
    return new Map((banks ?? []).map((bank) => [bank._id, bank.name] as const));
  }, [banks]);
  const paymentNetworkById = useMemo(() => {
    return new Map((paymentNetworks ?? []).map((network) => [network._id, network] as const));
  }, [paymentNetworks]);

  let activeFilterTitle = "Movimientos del sistema";
  if (selectedSource === "Caja diaria") {
    activeFilterTitle = "Caja diaria";
  } else if (selectedBankId) {
    activeFilterTitle = bankNameById.get(selectedBankId) ?? "Cuenta bancaria";
  } else if (selectedPaymentNetworkId) {
    activeFilterTitle = paymentNetworkById.get(selectedPaymentNetworkId)?.name ?? "Red de cobro";
  }

  const dateLabel = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
    : "Todo el periodo";

  const selectedPaymentNetworkBalance = movementPaymentNetworkId
    ? paymentNetworkById.get(movementPaymentNetworkId)?.currentBalance ?? 0
    : 0;
  const activePaymentNetworks = useMemo(
    () => (paymentNetworks ?? []).filter((network) => network.status === "Activo"),
    [paymentNetworks],
  );

  const handleOpenCash = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId) return;
    if (!openingDate || !openedBy.trim()) return;
    const [year, month, day] = openingDate.split("-").map(Number);
    const normalizedOpeningDate = new Date(year, month - 1, day).setHours(0, 0, 0, 0);
    await openCashSession({
      orgId,
      openingAmount: Number(openingAmount || "0"),
      openingDate: normalizedOpeningDate,
      openedBy: openedBy.trim(),
    });
    setCashDrawer(false);
    setOpeningAmount("0");
    setOpenedBy("");
  };

  const handleCloseCash = async () => {
    if (!orgId) return;
    await closeCashSession({ orgId, closingAmount: summary.closing });
    setCloseCashDrawer(false);
  };

  const handleMovementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgId) return;
    if (movementMode === "Liquidación") {
      if (!movementPaymentNetworkId || !movementLiquidationBankId) return;
      const amount = Number(movementAmount || "0");
      if (amount <= 0) {
        toastManager.add({
          type: "error",
          title: "Monto inválido",
          description: "El monto a liquidar debe ser mayor a cero.",
        });
        return;
      }
      if (amount > selectedPaymentNetworkBalance) {
        toastManager.add({
          type: "error",
          title: "Saldo insuficiente",
          description: "La red seleccionada no tiene saldo suficiente para liquidar ese monto.",
        });
        return;
      }
      try {
        await liquidatePaymentNetwork({
          orgId,
          paymentNetworkId: movementPaymentNetworkId as never,
          bankId: movementLiquidationBankId as never,
          amount,
          description: movementDescription.trim() || "Liquidación de red de cobro",
          confirmedAt: Date.now(),
        });
        setMovementDrawer(false);
        setMovementAmount("");
        setMovementDescription("");
        setMovementSource("Caja diaria");
        setMovementBankId("");
        setMovementWorkerId("");
        setMovementPaymentNetworkId("");
        setMovementLiquidationBankId("");
        setMovementMode("Egreso");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo registrar la liquidación.";
        toastManager.add({
          type: "error",
          title: "No se pudo liquidar",
          description: message,
        });
      }
      return;
    }
    if (movementSource === "Caja diaria" && !cashSessionState.open) return;
    if (movementSource === "Banco" && !movementBankId) return;
    try {
      await createTransaction({
        orgId,
        kind: movementMode === "Ingreso" ? "Ajuste" : movementMode,
        flow: movementMode === "Ingreso" ? "Ingreso" : "Salida",
        method: movementSource === "Banco" ? "Banco" : "Efectivo",
        amount: Number(movementAmount || "0"),
        description: movementDescription.trim() || (movementMode === "Anticipo" ? "Anticipo de sueldo" : ""),
        source: movementSource,
        bankId: movementSource === "Banco" ? movementBankId as Id<"banks"> : undefined,
        workerId: movementMode === "Anticipo" ? movementWorkerId as never : undefined,
      });
      setMovementDrawer(false);
      setMovementAmount("");
      setMovementDescription("");
      setMovementSource("Caja diaria");
      setMovementBankId("");
      setMovementWorkerId("");
      setMovementPaymentNetworkId("");
      setMovementLiquidationBankId("");
      setMovementMode("Egreso");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
      toastManager.add({ type: "error", title: "Error", description: message });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Finanzas"
        mobileTitle="Finanzas"
        toolbar={
          <SearchFilterBar
            value={search}
            onValueChange={setSearch}
            onClear={() => {
              setSearch("");
              const to = new Date();
              const from = new Date(to);
              from.setDate(from.getDate() - 7);
              setDateRange({ from, to });
            }}
            placeholder="Buscar transacciones, origen o medio"
          />
        }
      >
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="px-3">
                  <Calendar1 className="size-4" />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-2">
              <PresetCalendar
                selected={dateRange}
                onSelect={setDateRange}
                disabled={[{ after: new Date() }]}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => setMovementDrawer(true)} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Movimiento</span>
          </Button>
        </div>
      </AppHeader>

      <main className="flex-1 min-w-0 flex flex-col xl:flex-row xl:overflow-hidden p-4 sm:p-6 gap-5 overflow-y-auto">
        <aside className="flex flex-col gap-5 xl:overflow-y-auto w-full xl:w-[25%] xl:shrink-0 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <section>
              <div
              className={cn(
                "flex flex-col gap-2 rounded-3xl border p-3 sm:p-4 transition-colors",
                cashSessionState.open
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-zinc-200 bg-zinc-100/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400",
              )}
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedSource((current) =>
                  current === "Caja diaria" ? null : "Caja diaria",
                )
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Caja diaria</p>
                <Button
                  variant={cashSessionState.open ? "destructive" : "default"}
                  size="sm"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    cashSessionState.open ? setCloseCashDrawer(true) : setCashDrawer(true);
                  }}
                >
                  <span className="hidden sm:inline">
                    {cashSessionState.open ? "Cerrar caja" : "Abrir caja"}
                  </span>
                  <span className="sm:hidden">{cashSessionState.open ? "Cerrar" : "Abrir"}</span>
                </Button>
              </div>
              {cashSessionState.openingDate ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Fecha {new Date(cashSessionState.openingDate).toLocaleDateString("es-EC")}</span>
                  {cashSessionState.openedBy ? <span>· {cashSessionState.openedBy}</span> : null}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Efectivo</p>
                  <p className="mt-0.5 text-base font-semibold">{formatMoney(summary.efectivo)}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo total</p>
                  <p className="mt-0.5 text-base font-semibold">{formatMoney(summary.closing)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Cuentas bancarias</h2>
            <div className="grid gap-2">
              {(banks ?? []).map((bank) => (
                <button
                  key={bank._id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(null);
                    setSelectedBankId((current) => (current === bank._id ? null : bank._id));
                  }}
                  className={cn(
                    "rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:border-primary/30 hover:bg-accent/20",
                    selectedBankId === bank._id && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={bank.status === "Activo" ? "default" : "secondary"}
                      className={cn(
                        "h-4.5 px-1.5 text-[8px]",
                        bank.status === "Activo"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {bank.status}
                    </Badge>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Saldo</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-tight">{bank.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {[bank.bankName, bank.accountNumber].filter(Boolean).join(" · ") || "Cuenta bancaria"}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold leading-none">
                      {formatMoney(bank.currentBalance ?? bank.initialBalance ?? 0)}
                    </p>
                  </div>
                </button>
              ))}
              {!banks?.length ? (
                <div className="rounded-2xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                  Todavía no hay cuentas bancarias creadas.
                </div>
              ) : null}
            </div>
            {selectedBankId ? (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Filtrando por banco seleccionado</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedBankId(null)}>
                  Ver todo
                </Button>
              </div>
            ) : null}
            {selectedSource ? (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Filtrando por caja diaria</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedSource(null)}>
                  Ver todo
                </Button>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold">Redes de cobro</h2>
            <div className="grid gap-2">
              {(paymentNetworks ?? []).map((network) => (
                <button
                  key={network._id}
                  type="button"
                  onClick={() => {
                    setSelectedSource(null);
                    setSelectedBankId(null);
                    setSelectedPaymentNetworkId((current) => (current === network._id ? null : network._id));
                  }}
                  className={cn(
                    "rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:border-primary/30 hover:bg-accent/20",
                    selectedPaymentNetworkId === network._id && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-tight">{network.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {network.alias || "Sin alias"} · Comisión {network.commissionRate.toFixed(2)}%
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold leading-none">
                      {formatMoney(network.currentBalance ?? 0)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium",
                        network.status === "Activo"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          network.status === "Activo" ? "bg-emerald-500" : "bg-zinc-400",
                        )}
                      />
                      {network.status}
                    </span>
                    <span>Saldo pendiente</span>
                  </div>
                </button>
              ))}
              {!paymentNetworks?.length ? (
                <div className="rounded-2xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
                  Todavía no hay redes de cobro creadas.
                </div>
              ) : null}
            </div>
            {selectedPaymentNetworkId ? (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Filtrando por red de cobro seleccionada</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedPaymentNetworkId(null)}
                >
                  Ver todo
                </Button>
              </div>
            ) : null}
          </section>
        </aside>

        <section className="flex flex-1 min-h-0 flex-col rounded-3xl border bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 shrink-0">
            <h2 className="text-sm font-semibold">{activeFilterTitle}</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="divide-y">
              {(pagedTransactions ?? []).map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTransactionId(tx.id)}
                  className={cn(
                    "grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30 sm:grid-cols-[1fr_auto] sm:items-center",
                    KIND_COLORS[tx.kind],
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{tx.kind}</Badge>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tx.color)}>
                        {methodLabel(tx.method)}
                        {tx.method === "Banco" && tx.bankId ? ` · ${bankNameById.get(tx.bankId) ?? "Cuenta"}` : ""}
                        {tx.method === "Tarjeta" && tx.paymentNetworkId
                          ? ` · ${tx.paymentNetworkName ?? paymentNetworkById.get(tx.paymentNetworkId)?.name ?? "Red"} · ${formatMoney(tx.grossAmount ?? tx.amount)} · ${((tx.commissionRate ?? 0)).toFixed(2)}% · ${formatMoney(tx.netAmount ?? tx.amount)} neto`
                          : tx.kind === "Liquidación" && tx.paymentNetworkId
                            ? ` · ${tx.paymentNetworkName ?? paymentNetworkById.get(tx.paymentNetworkId)?.name ?? "Red"} · ${formatMoney(tx.grossAmount ?? tx.amount)} · ${((tx.commissionRate ?? 0)).toFixed(2)}% · ${formatMoney(tx.netAmount ?? tx.amount)} al banco`
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tx.confirmedAt).toLocaleString("es-EC")}
                      </span>
                    </div>
                    <p className="mt-2 truncate font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.source} · {tx.status} · {tx.sourceModule ?? "manual"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold", tx.flow === "Ingreso" ? "text-emerald-600" : "text-rose-600")}>
                        {tx.flow === "Ingreso" ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.flow}</p>
                    </div>
                  </div>
                </button>
              ))}
              {!filteredTransactions.length ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No hay transacciones registradas todavía para este periodo.
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t bg-background px-4 py-3 shrink-0 rounded-b-3xl">
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={30} />
          </div>
        </section>
      </main>

      <Drawer position="right" open={cashDrawer} onOpenChange={setCashDrawer}>
        <DrawerPopup variant="inset">
          <DrawerHeader>
            <DrawerTitle>Abrir caja diaria</DrawerTitle>
            <DrawerDescription>
              Define la fecha de apertura, quién abre y el monto inicial.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleOpenCash} className="flex min-h-0 flex-1 flex-col">
            <DrawerPanel className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="openingDate">Fecha de apertura</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" type="button" className="w-full justify-start">
                        <Calendar1 className="size-4" />
                        <span>{format(new Date(`${openingDate}T00:00:00`), "dd/MM/yyyy")}</span>
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-2">
                    <Calendar
                      mode="single"
                      selected={new Date(`${openingDate}T00:00:00`)}
                      onSelect={(date) => {
                        if (!date) return;
                        setOpeningDate(format(date, "yyyy-MM-dd"));
                      }}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openedBy">Abre</Label>
                <Input
                  id="openedBy"
                  value={openedBy}
                  onChange={(e) => setOpenedBy(e.target.value)}
                  placeholder="Nombre de quien abre la caja"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="openingAmount">Monto inicial</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
            </DrawerPanel>
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button type="submit">Abrir caja</Button>
            </DrawerFooter>
          </form>
        </DrawerPopup>
      </Drawer>

      <Drawer position="right" open={closeCashDrawer} onOpenChange={setCloseCashDrawer}>
        <DrawerPopup variant="inset">
          <DrawerHeader>
            <DrawerTitle>Cerrar caja diaria</DrawerTitle>
            <DrawerDescription>
              El documento de cierre resume solo el efectivo de la caja diaria.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <DrawerPanel className="grid gap-4">
              <Card className="border-dashed p-4">
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Efectivo del día</span>
                    <span className="font-medium text-emerald-600">{formatMoney(summary.efectivo > 0 ? summary.efectivo : 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t pt-3">
                    <span className="font-medium">Saldo de cierre</span>
                    <span className="text-lg font-semibold">{formatMoney(summary.closing)}</span>
                  </div>
                </div>
              </Card>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>Transacciones de caja confirmadas: {filteredTransactions.length}</p>
                <p>El cierre emite el documento resumen y no modifica los movimientos del día.</p>
              </div>
            </DrawerPanel>
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" type="button">Volver</Button>} />
              <Button type="button" variant="destructive" onClick={handleCloseCash}>
                Confirmar cierre
              </Button>
            </DrawerFooter>
          </div>
        </DrawerPopup>
      </Drawer>

      <Drawer position="right" open={movementDrawer} onOpenChange={setMovementDrawer}>
        <DrawerPopup variant="inset">
          <DrawerHeader>
            <DrawerTitle>{movementMode}</DrawerTitle>
            <DrawerDescription>
              {movementMode === "Egreso" || movementMode === "Anticipo"
                ? "Registra un egreso que sale de caja diaria o una salida bancaria."
                : "Registra un ingreso de efectivo a caja diaria o un ingreso bancario."}
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleMovementSubmit} className="flex min-h-0 flex-1 flex-col">
            <DrawerPanel className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="movementMode">Tipo</Label>
                <select
                  id="movementMode"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  value={movementMode}
                  onChange={(e) => setMovementMode(e.target.value as "Egreso" | "Ingreso" | "Anticipo" | "Liquidación")}
                >
                  <option value="Egreso">Egreso</option>
                  <option value="Anticipo">Anticipo</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Liquidación">Liquidación</option>
                </select>
              </div>
              {movementMode === "Liquidación" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="movementPaymentNetworkId">Red de cobro</Label>
                    <select
                      id="movementPaymentNetworkId"
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                      value={movementPaymentNetworkId}
                      onChange={(e) => setMovementPaymentNetworkId(e.target.value)}
                    >
                      <option value="">Selecciona una red</option>
                      {activePaymentNetworks.map((network) => (
                        <option key={network._id} value={network._id}>
                          {network.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    <span className="block text-[11px] uppercase tracking-wide text-muted-foreground/80">
                      Saldo disponible
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-foreground">
                      {movementPaymentNetworkId
                        ? formatMoney(selectedPaymentNetworkBalance)
                        : "Selecciona una red para ver el saldo"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movementLiquidationBankId">Banco destino</Label>
                    <select
                      id="movementLiquidationBankId"
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                      value={movementLiquidationBankId}
                      onChange={(e) => setMovementLiquidationBankId(e.target.value)}
                    >
                      <option value="">Selecciona un banco</option>
                      {banks?.map((bank) => (
                        <option key={bank._id} value={bank._id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movementAmount">Monto a liquidar</Label>
                    <Input
                      id="movementAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      placeholder="Monto neto a mover al banco"
                    />
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                    La liquidación mueve el saldo pendiente neto de la red al banco destino.
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="movementAmount">Monto</Label>
                    <Input
                      id="movementAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                    />
                  </div>
                  {movementMode === "Anticipo" && (
                    <div className="space-y-2">
                      <Label htmlFor="movementWorkerId">Trabajador</Label>
                      <select
                        id="movementWorkerId"
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                        value={movementWorkerId}
                        onChange={(e) => {
                          const workerName = workers?.find((worker) => worker._id === e.target.value)?.name;
                          setMovementWorkerId(e.target.value);
                          if (workerName && !movementDescription.trim()) {
                            setMovementDescription(`Anticipo sueldo - ${workerName}`);
                          }
                        }}
                      >
                        <option value="">Selecciona trabajador</option>
                        {workers?.filter((worker) => worker.employmentStatus === "Activo").map((worker) => (
                          <option key={worker._id} value={worker._id}>{worker.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="movementSource">Origen</Label>
                    <select
                      id="movementSource"
                      className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                      value={movementSource}
                      onChange={(e) => setMovementSource(e.target.value)}
                    >
                      <option value="Caja diaria">Caja diaria</option>
                      <option value="Banco">Banco</option>
                    </select>
                  </div>
                  {movementSource === "Caja diaria" && !cashSessionState.open ? (
                    <p className="text-xs text-muted-foreground">
                      La caja diaria debe estar abierta para registrar movimientos en efectivo.
                    </p>
                  ) : null}
                  {movementSource === "Banco" && (
                    <div className="space-y-2">
                      <Label htmlFor="movementBankId">Cuenta bancaria</Label>
                      <select
                        id="movementBankId"
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                        value={movementBankId}
                        onChange={(e) => setMovementBankId(e.target.value)}
                      >
                        <option value="">Selecciona un banco</option>
                        {banks?.map((bank) => (
                          <option key={bank._id} value={bank._id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="movementDescription">Descripción</Label>
                <Textarea
                  id="movementDescription"
                  value={movementDescription}
                  onChange={(e) => setMovementDescription(e.target.value)}
                  placeholder={
                    movementMode === "Liquidación"
                      ? "Ej: liquidación de tarjeta a banco"
                        : movementMode === "Anticipo"
                          ? "Ej: anticipo sueldo - trabajador"
                          : movementMode === "Ingreso"
                        ? "Ej: ingreso de efectivo a caja diaria"
                        : "Ej: egreso de almuerzo"
                  }
                />
              </div>
            </DrawerPanel>
            <DrawerFooter>
              <DrawerClose render={<Button variant="outline" type="button">Cancelar</Button>} />
              <Button
                type="submit"
                disabled={
                  (movementMode !== "Liquidación" && movementSource === "Caja diaria" && !cashSessionState.open) ||
                  (movementMode === "Anticipo" && !movementWorkerId) ||
                  (movementMode === "Liquidación" &&
                    (!movementPaymentNetworkId ||
                      !movementLiquidationBankId ||
                      Number(movementAmount || "0") <= 0 ||
                      Number(movementAmount || "0") > selectedPaymentNetworkBalance))
                }
              >
                Guardar
              </Button>
            </DrawerFooter>
          </form>
        </DrawerPopup>
      </Drawer>

      <TransactionDetailsSheet
        transaction={
          selectedTransaction
            ? {
                ...selectedTransaction,
                bankName:
                  selectedTransaction.bankId ? bankNameById.get(selectedTransaction.bankId) ?? undefined : undefined,
                bankAccountNumber: selectedTransaction.bankId
                  ? banks?.find((bank) => bank._id === selectedTransaction.bankId)?.accountNumber ?? undefined
                  : undefined,
                paymentNetworkName: selectedTransaction.paymentNetworkId
                  ? paymentNetworkById.get(selectedTransaction.paymentNetworkId)?.name ?? undefined
                  : undefined,
              }
            : null
        }
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransactionId(null);
        }}
      />
    </div>
  );
}
