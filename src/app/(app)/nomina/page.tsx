"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { type Id } from "@convex/_generated/dataModel";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { PaginationBar } from "@/components/pagination-bar";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectPopup, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { Plus, Trash2 } from "lucide-react";

type Status = "Borrador" | "Confirmado" | "Pagado" | "Anulado";
type PayrollRun = {
  _id: Id<"payroll_runs">;
  _creationTime: number;
  periodYear: number;
  periodMonth: number;
  name: string;
  status: Status;
  totalSalary: number;
  totalIncome: number;
  totalManualDeductions: number;
  totalAdvances: number;
  totalNet: number;
};
type Worker = { _id: Id<"clients">; name: string; type?: "Cliente" | "Proveedor" | "Trabajador"; employmentStatus?: "Activo" | "Inactivo" };
type Bank = { _id: Id<"banks">; name: string };
type PayrollAdjustment = { _id: Id<"payroll_adjustments">; kind: "Ingreso" | "Descuento"; concept: string; amount: number };
type SalaryAdvance = { _id: Id<"salary_advances">; amount: number; status: string; selected?: boolean; transaction?: { description?: string } | null };
type PayrollPayment = {
  _id: Id<"payroll_payments">;
  workerId: Id<"clients">;
  workerName: string;
  salaryAmount: number;
  incomeAmount: number;
  manualDeductionAmount: number;
  advanceAmount: number;
  netAmount: number;
  status: Status;
  notes?: string;
  adjustments: PayrollAdjustment[];
  advances: SalaryAdvance[];
};
type PayrollDetails = { run: PayrollRun; payments: PayrollPayment[]; banks: Bank[] };

function money(value: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function deductions(payment: PayrollPayment) {
  return payment.manualDeductionAmount + payment.advanceAmount;
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function NominaPage() {
  const { orgId } = useOrg();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [status, setStatus] = useState<Status | "Todos">("Todos");
  const [newMonth, setNewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [payingPaymentId, setPayingPaymentId] = useState<string | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [annulDialogOpen, setAnnulDialogOpen] = useState(false);
  const [workerId, setWorkerId] = useState("");
  const [salary, setSalary] = useState("");
  const [adjustKind, setAdjustKind] = useState<"Ingreso" | "Descuento">("Ingreso");
  const [adjustConcept, setAdjustConcept] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"Efectivo" | "Banco" | "Transferencia">("Efectivo");
  const [payBankId, setPayBankId] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [annulReason, setAnnulReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const yearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return Array.from({ length: Math.max(1, 2030 - (thisYear - 2) + 1) }, (_, i) => thisYear - 2 + i).filter((v) => v <= 2030);
  }, []);

  const runs = useQuery(api.payroll.listRuns, orgId ? { orgId, year, status: status === "Todos" ? undefined : status } : "skip") as PayrollRun[] | undefined;
  const allYearRuns = useQuery(api.payroll.listRuns, orgId ? { orgId, year } : "skip") as PayrollRun[] | undefined;
  const createRun = useMutation(api.payroll.createRun);
  const details = useQuery(api.payroll.getRunDetails, selectedRunId ? { runId: selectedRunId as never } : "skip") as PayrollDetails | null | undefined;
  const workers = useQuery(api.clients.get, orgId ? { orgId, type: "Trabajador" } : "skip") as Worker[] | undefined;

  const addWorker = useMutation(api.payroll.addWorker);
  const toggleAdvanceSelection = useMutation(api.payroll.toggleAdvanceSelection);
  const removePayment = useMutation(api.payroll.removePayment);
  const updatePayment = useMutation(api.payroll.updatePayment);
  const addAdjustment = useMutation(api.payroll.addAdjustment);
  const deleteAdjustment = useMutation(api.payroll.deleteAdjustment);
  const confirmRun = useMutation(api.payroll.confirmRun);
  const payPayment = useMutation(api.payroll.payPayment);
  const undoPaidPayment = useMutation(api.payroll.undoPaidPayment);
  const annulRun = useMutation(api.payroll.annulRun);

  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    if (!debouncedSearchTerm) return runs;
    const lower = debouncedSearchTerm.toLowerCase();
    return runs.filter((run) => {
      const periodName = `${MONTHS[run.periodMonth - 1]} ${run.periodYear}`.toLowerCase();
      return run.name.toLowerCase().includes(lower) || periodName.includes(lower);
    });
  }, [runs, debouncedSearchTerm]);

  const filteredPayments = useMemo(() => {
    if (!details?.payments) return [];
    if (!debouncedSearchTerm) return details.payments;
    const lower = debouncedSearchTerm.toLowerCase();
    return details.payments.filter((payment) => payment.workerName.toLowerCase().includes(lower));
  }, [details?.payments, debouncedSearchTerm]);

  const selectedPayment = useMemo(
    () => details?.payments?.find((payment) => String(payment._id) === String(selectedPaymentId)) ?? null,
    [details?.payments, selectedPaymentId],
  );
  const payingPayment = useMemo(
    () => details?.payments?.find((payment) => String(payment._id) === String(payingPaymentId)) ?? null,
    [details?.payments, payingPaymentId],
  );
  const availableWorkers = useMemo(() => {
    const used = new Set((details?.payments ?? []).map((payment) => String(payment.workerId)));
    return (workers ?? []).filter((worker) => worker.type === "Trabajador" && worker.employmentStatus === "Activo" && !used.has(String(worker._id)));
  }, [details?.payments, workers]);
  const paymentsPageSize = 10;
  const paymentsTotal = filteredPayments.length;
  const paymentsTotalPages = Math.max(1, Math.ceil(paymentsTotal / paymentsPageSize));
  const safePaymentsPage = Math.min(paymentsPage, paymentsTotalPages);
  const pagedPayments = useMemo(
    () => filteredPayments.slice((safePaymentsPage - 1) * paymentsPageSize, safePaymentsPage * paymentsPageSize),
    [filteredPayments, safePaymentsPage],
  );
  const runExistsForSelection = (allYearRuns ?? []).some((run) => run.status !== "Anulado" && run.periodYear === year && run.periodMonth === newMonth);

  function openPayment(payment: PayrollPayment) {
    setSelectedPaymentId(String(payment._id));
    setSalary(String(payment.salaryAmount ?? 0));
  }

  async function runAction(action: () => Promise<unknown>, title = "Listo") {
    try {
      await action();
      toastManager.add({ type: "success", title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("No hay trabajadores activos para este período.")) {
        toastManager.add({
          type: "error",
          title: "No hay trabajadores activos",
          description: "No puedes crear la nómina hasta que exista al menos un trabajador activo en este período.",
        });
        return;
      }
      toastManager.add({ type: "error", title: "Error", description: error instanceof Error ? error.message : "No se pudo completar la acción." });
    }
  }

  return (
    <div className="flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden">
      <AppHeader
        title="Nómina"
        mobileTitle="Nómina"
        toolbar={
          <SearchFilterBar
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar trabajador o lote..."
            onClear={() => setSearchTerm("")}
          />
        }
      >
        <div className="flex w-full items-center justify-end gap-2">
          <Select value={year} onValueChange={(value) => setYear(value as number)} items={yearOptions.map((value) => ({ value, label: String(value) }))}>
            <SelectTrigger className="h-9 w-24" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {yearOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select value={newMonth} onValueChange={(value) => setNewMonth(value as number)} items={MONTHS.map((label, index) => ({ value: index + 1, label }))}>
            <SelectTrigger className="h-9 w-32 hidden sm:flex" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={index + 1}>
                  {month}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Button
            size="sm"
            onClick={() => orgId && runAction(async () => {
              if (runExistsForSelection) {
                toastManager.add({
                  type: "warning",
                  title: "Nómina existente",
                  description: "Ya existe una nómina para este período.",
                });
                return;
              }
              const runId = await createRun({ orgId, periodYear: year, periodMonth: newMonth });
              setSelectedRunId(String(runId));
              setPaymentsPage(1);
            }, "Nómina creada")}
            disabled={runExistsForSelection}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Crear</span>
          </Button>
        </div>
      </AppHeader>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-hidden p-4 sm:p-6 gap-5 overflow-y-auto">
        <aside className="flex flex-col gap-5 xl:overflow-y-auto w-full xl:w-[25%] xl:shrink-0 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-base font-semibold">Lotes</h2>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as Status | "Todos")}
                items={[
                  { value: "Todos", label: "Todos" },
                  { value: "Borrador", label: "Borrador" },
                  { value: "Confirmado", label: "Confirmado" },
                  { value: "Pagado", label: "Pagado" },
                  { value: "Anulado", label: "Anulado" },
                ]}
              >
                <SelectTrigger className="h-8 min-w-28" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Confirmado">Confirmado</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Anulado">Anulado</SelectItem>
                </SelectPopup>
              </Select>
            </div>
            <div className="grid gap-2">
              {filteredRuns.map((run) => (
                <button
                  key={run._id}
                  type="button"
                  onClick={() => {
                    setSelectedRunId(String(run._id));
                    setPaymentsPage(1);
                  }}
                  className={cn(
                    "rounded-2xl border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/20",
                    selectedRunId === String(run._id) && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Periodo</p>
                      <h3 className="truncate text-sm font-semibold leading-tight">
                        {MONTHS[run.periodMonth - 1]} {run.periodYear}
                      </h3>
                    </div>
                    <Badge
                      variant={run.status === "Borrador" ? "secondary" : run.status === "Confirmado" ? "default" : "outline"}
                      className="h-4.5 shrink-0 px-1.5 text-[8px]"
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Total a pagar</span>
                    <span className="font-semibold">{money(run.totalNet)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Creado</span>
                    <span>{new Date(run._creationTime).toLocaleDateString("es-EC")}</span>
                  </div>
                </button>
              ))}
            </div>
            {runs && !filteredRuns.length ? <div className="rounded-2xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">No hay lotes.</div> : null}
          </section>
        </aside>

        <section className="min-h-0 flex-1 overflow-hidden rounded-3xl border bg-background">
          {!details ? (
            <div className="p-6 text-sm text-muted-foreground">Selecciona un lote.</div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Lote seleccionado</p>
                      <span className="text-xs text-muted-foreground">
                        {String(details.run.periodMonth).padStart(2, "0")}/{details.run.periodYear}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-lg font-semibold">{details.run.name}</h2>
                      <Badge
                        variant={details.run.status === "Borrador" ? "secondary" : details.run.status === "Confirmado" ? "default" : "outline"}
                        className="shrink-0"
                      >
                        {details.run.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Sueldos {money(details.run.totalSalary)}</span>
                      <span>Ingresos {money(details.run.totalIncome)}</span>
                      <span>Descuentos {money(details.run.totalManualDeductions)}</span>
                      <span>Anticipos {money(details.run.totalAdvances)}</span>
                      <span className="font-medium text-foreground">Neto {money(details.run.totalNet)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {details.run.status === "Borrador" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setAddWorkerOpen(true)}>Añadir</Button>
                        <Button size="sm" onClick={() => runAction(() => confirmRun({ runId: details.run._id }), "Lote confirmado")}>Confirmar</Button>
                      </>
                    )}
                    {details.run.status !== "Pagado" && details.run.status !== "Anulado" && (
                      <Button size="sm" variant="destructive" onClick={() => setAnnulDialogOpen(true)}>Anular</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid min-w-[820px] grid-cols-[1.4fr_.7fr_.7fr_.9fr_.8fr_.8fr_1fr] border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Trabajador</span><span>Sueldo</span><span>Ingresos</span><span>Descuentos</span><span>Neto</span><span>Estado</span><span className="text-right">Acciones</span>
                </div>
                {pagedPayments.map((payment) => (
                  <div key={payment._id} className="grid min-w-[820px] grid-cols-[1.4fr_.7fr_.7fr_.9fr_.8fr_.8fr_1fr] items-center border-b px-3 py-2 text-sm">
                    <span className="font-medium">{payment.workerName}</span>
                    <span>{money(payment.salaryAmount)}</span>
                    <span>{money(payment.incomeAmount)}</span>
                    <span>{money(deductions(payment))}</span>
                    <span>{money(payment.netAmount)}</span>
                    <Badge>{payment.status}</Badge>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openPayment(payment)}>Abrir</Button>
                      {details.run.status === "Confirmado" && payment.status === "Confirmado" && <Button size="sm" onClick={() => setPayingPaymentId(String(payment._id))}>Pagar</Button>}
                      {details.run.status === "Confirmado" && payment.status === "Pagado" && <Button size="sm" variant="outline" onClick={() => runAction(() => undoPaidPayment({ paymentId: payment._id }), "Pago revertido")}>Revertir</Button>}
                      {details.run.status === "Borrador" && <Button size="icon" variant="ghost" onClick={() => runAction(() => removePayment({ paymentId: payment._id }), "Trabajador quitado")}><Trash2 className="size-4" /></Button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t px-4 py-3">
                <PaginationBar
                  page={safePaymentsPage}
                  totalPages={paymentsTotalPages}
                  onPageChange={setPaymentsPage}
                  total={paymentsTotal}
                  pageSize={paymentsPageSize}
                />
              </div>
            </div>
          )}
        </section>
      </main>

      <Drawer position="right" open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
        <DrawerPopup variant="inset">
          <DrawerHeader>
            <DrawerTitle>Añadir trabajador</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel className="grid gap-4">
            <div className="space-y-2">
              <Label>Trabajador activo</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={workerId}
                onChange={(event) => setWorkerId(event.target.value)}
              >
                <option value="">Selecciona trabajador</option>
                {availableWorkers.map((worker) => (
                  <option key={worker._id} value={worker._id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>
            {!availableWorkers.length ? (
              <p className="text-sm text-muted-foreground">No hay trabajadores activos disponibles para añadir.</p>
            ) : null}
          </DrawerPanel>
          <DrawerFooter>
            <DrawerClose render={<Button variant="outline">Cancelar</Button>} />
            <Button
              disabled={!workerId || !details || details.run.status !== "Borrador"}
              onClick={() => {
                if (!details || !workerId) return;
                void runAction(async () => {
                  await addWorker({ runId: details.run._id, workerId: workerId as Id<"clients"> });
                  setWorkerId("");
                  setAddWorkerOpen(false);
                }, "Trabajador añadido");
              }}
            >
              Añadir
            </Button>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>

      <Dialog open={annulDialogOpen} onOpenChange={setAnnulDialogOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Anular proceso</DialogTitle>
            <DialogDescription>Indica el motivo para dejar este lote como anulado.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-2">
            <Label htmlFor="annulReason">Motivo</Label>
            <Textarea
              id="annulReason"
              value={annulReason}
              onChange={(event) => setAnnulReason(event.target.value)}
              placeholder="Ej: error en el período o datos incorrectos"
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancelar</Button>} />
            <Button
              variant="destructive"
              disabled={!annulReason.trim() || !details || details.run.status === "Pagado" || details.run.status === "Anulado"}
              onClick={() => {
                if (!details || !annulReason.trim()) return;
                void runAction(async () => {
                  await annulRun({ runId: details.run._id, reason: annulReason });
                  setAnnulReason("");
                  setAnnulDialogOpen(false);
                }, "Lote anulado");
              }}
            >
              Anular proceso
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Drawer position="right" open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPaymentId(null)}>
        <DrawerPopup variant="inset">
          <DrawerHeader>
            <DrawerTitle>{selectedPayment?.workerName}</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Sueldo del mes</Label>
                  <Input type="number" min="0" step="0.01" value={salary} disabled={details?.run.status !== "Borrador"} onChange={(e) => setSalary(e.target.value)} />
                </div>
                {details?.run.status === "Borrador" && (
                  <Button
                    className="shrink-0"
                    onClick={() => selectedPayment && runAction(() => updatePayment({ paymentId: selectedPayment._id, salaryAmount: Number(salary || "0") }), "Pago actualizado")}
                  >
                    Guardar
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Agregar movimiento</Label>
                <div className="grid gap-3 rounded-2xl border bg-muted/10 p-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
                    <Select
                      value={adjustKind}
                      onValueChange={(value) => setAdjustKind(value as "Ingreso" | "Descuento")}
                      items={[
                        { value: "Ingreso", label: "Ingreso" },
                        { value: "Descuento", label: "Descuento" },
                      ]}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="Ingreso">Ingreso</SelectItem>
                        <SelectItem value="Descuento">Descuento</SelectItem>
                      </SelectPopup>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-end">
                    <div className="min-w-0 space-y-2">
                      <Label>Concepto</Label>
                      <Input placeholder="Ej: multa, horas extra, bono" value={adjustConcept} onChange={(e) => setAdjustConcept(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monto</Label>
                      <Input type="number" min="0" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
                    </div>
                    {details?.run.status === "Borrador" && (
                      <Button
                        className="h-9 sm:min-w-24"
                        disabled={!selectedPayment || !adjustConcept.trim() || Number(adjustAmount || "0") <= 0}
                        onClick={() => {
                          if (!selectedPayment) return;
                          const paymentId = selectedPayment._id;
                          void runAction(async () => {
                            await addAdjustment({
                              paymentId,
                              kind: adjustKind,
                              concept: adjustConcept,
                              amount: Number(adjustAmount || "0"),
                            });
                            setAdjustConcept("");
                            setAdjustAmount("");
                          }, "Movimiento añadido");
                        }}
                      >
                        Añadir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Movimientos registrados</Label>
                <span className="text-xs text-muted-foreground">Neto {money(selectedPayment?.netAmount ?? 0)}</span>
              </div>
              {(selectedPayment?.adjustments ?? []).length || (selectedPayment?.advances ?? []).length ? (
                [...(selectedPayment?.adjustments ?? []).map((item, index) => ({
                  key: String(item._id),
                  order: index,
                  kind: item.kind,
                  title: item.concept,
                  amount: item.amount,
                  selected: false,
                  status: "",
                  deletable: details?.run.status === "Borrador",
                  onDelete: () => runAction(() => deleteAdjustment({ adjustmentId: item._id }), "Movimiento eliminado"),
                })), ...(selectedPayment?.advances ?? []).map((item, index) => ({
                  key: String(item._id),
                  order: 100 + index,
                  kind: "Anticipo",
                  title: item.transaction?.description ?? "Anticipo",
                  amount: item.amount,
                  selected: Boolean(item.selected),
                  status: item.status,
                  deletable: false,
                  onDelete: null,
                }))].sort((a, b) => {
                  const kindOrder = (value: string) => (value === "Ingreso" ? 0 : value === "Anticipo" ? 1 : 2);
                  return kindOrder(a.kind) - kindOrder(b.kind) || a.order - b.order;
                }).map((item) => (
                  <div key={item.key} className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm">
                    {item.kind === "Anticipo" ? (
                      <Checkbox
                        checked={item.selected}
                        disabled={details?.run.status !== "Borrador"}
                        onCheckedChange={(checked) => {
                          if (!selectedPayment || details?.run.status !== "Borrador") return;
                          void runAction(async () => {
                            await toggleAdvanceSelection({
                              paymentId: selectedPayment._id,
                              advanceId: item.key as Id<"salary_advances">,
                              selected: Boolean(checked),
                            });
                          }, checked ? "Anticipo cargado" : "Anticipo quitado");
                        }}
                        className="mt-0.5"
                      />
                    ) : (
                      <span className={cn("mt-1 size-2 rounded-full", item.kind === "Ingreso" ? "bg-emerald-500" : "bg-destructive")} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate">
                          {item.kind}: {item.title}
                        </span>
                        <strong>{money(item.amount)}</strong>
                      </div>
                      {item.kind === "Anticipo" ? (
                        <p className="text-xs text-muted-foreground">{item.status}</p>
                      ) : null}
                    </div>
                    {item.deletable ? (
                      <Button size="icon" variant="ghost" onClick={item.onDelete as never}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
              )}
            </div>
          </DrawerPanel>
          <DrawerFooter><DrawerClose render={<Button variant="outline">Cerrar</Button>} /></DrawerFooter>
        </DrawerPopup>
      </Drawer>

      <Drawer position="right" open={!!payingPayment} onOpenChange={(open) => !open && setPayingPaymentId(null)}>
        <DrawerPopup variant="inset">
          <DrawerHeader><DrawerTitle>Pagar {payingPayment?.workerName}</DrawerTitle></DrawerHeader>
          <DrawerPanel className="grid gap-4">
            <Card className="rounded-2xl border bg-muted/20 p-4 text-sm shadow-none">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Neto a pagar</span>
                <strong className="text-base">{money(payingPayment?.netAmount ?? 0)}</strong>
              </div>
            </Card>
            {(payingPayment?.netAmount ?? 0) > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Método</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={payMethod} onChange={(e) => setPayMethod(e.target.value as "Efectivo" | "Banco" | "Transferencia")}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Banco">Banco</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
                {payMethod !== "Efectivo" && (
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={payBankId} onChange={(e) => setPayBankId(e.target.value)}>
                      <option value="">Selecciona banco</option>
                      {details?.banks?.map((bank) => <option key={bank._id} value={bank._id}>{bank.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} placeholder="Cheque #, comprobante o nota" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Fecha de pago</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </DrawerPanel>
          <DrawerFooter>
            <DrawerClose render={<Button variant="outline">Cancelar</Button>} />
            <Button disabled={(payingPayment?.netAmount ?? 0) > 0 && payMethod !== "Efectivo" && !payBankId} onClick={() => payingPayment && runAction(async () => {
              await payPayment({
                paymentId: payingPayment._id,
                method: payingPayment.netAmount > 0 ? payMethod : undefined,
                bankId: payingPayment.netAmount > 0 && payMethod !== "Efectivo" ? payBankId as never : undefined,
                reference: payReference,
                paidAt: (() => { const [y, m, d] = payDate.split("-").map(Number); return new Date(y, m - 1, d).getTime(); })(),
              });
              setPayingPaymentId(null);
              setPayBankId("");
              setPayReference("");
              setPayDate(new Date().toISOString().slice(0, 10));
            }, "Pago registrado")}>Confirmar pago</Button>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>
    </div>
  );
}
