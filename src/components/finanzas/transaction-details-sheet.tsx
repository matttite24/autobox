"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { type Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import {
  Sheet,
  SheetPopup,
  SheetPanel,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FinanceTransaction = {
  id: string;
  kind: "Cobro" | "Pago" | "Gasto" | "Egreso" | "Anticipo" | "Liquidación" | "Movimiento bancario" | "Ajuste";
  flow: "Ingreso" | "Salida";
  method: "Efectivo" | "Tarjeta" | "Transferencia" | "Banco";
  bankName?: string;
  bankAccountNumber?: string;
  paymentNetworkName?: string;
  grossAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  netAmount?: number;
  amount: number;
  description: string;
  source: string;
  sourceModule?: "ordenes" | "ventas" | "compras" | "nomina" | "manual";
  sourceId?: string;
  confirmedAt: number;
  status: "Confirmada" | "Anulada";
  color: string;
};

type TransactionDetailsSheetProps = {
  transaction: FinanceTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function TransactionDetailsSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup side="right" className="sm:max-w-md">
        {transaction ? (
          <>
            <SheetHeader>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{transaction.kind}</Badge>
                  <Badge variant="outline">{transaction.status}</Badge>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
                    {transaction.method}
                    {transaction.method === "Banco" && transaction.bankName ? ` · ${transaction.bankName}` : ""}
                  </span>
                </div>
                <SheetTitle>{transaction.description}</SheetTitle>
                <SheetDescription>
                  {transaction.source} · {new Date(transaction.confirmedAt).toLocaleString("es-EC")}
                </SheetDescription>
              </div>
            </SheetHeader>

            <SheetPanel className="space-y-6">
              <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Monto</span>
                  <span className="text-xl font-semibold">
                    {transaction.flow === "Ingreso" ? "+" : "-"}
                    {formatMoney(transaction.amount)}
                  </span>
                </div>
                {transaction.method === "Tarjeta" || transaction.kind === "Liquidación" ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Red de cobro</span>
                      <span className="text-sm font-medium">{transaction.paymentNetworkName ?? "Sin red"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Bruto</span>
                      <span className="text-sm font-medium">{formatMoney(transaction.grossAmount ?? transaction.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Comisión</span>
                      <span className="text-sm font-medium">
                        {formatMoney(transaction.commissionAmount ?? 0)}
                        {transaction.commissionRate !== undefined ? ` (${transaction.commissionRate.toFixed(2)}%)` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Neto</span>
                      <span className="text-sm font-medium">{formatMoney(transaction.netAmount ?? transaction.amount)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Naturaleza</span>
                  <span className="text-sm font-medium">{transaction.flow}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Origen</span>
                  <span className="text-sm font-medium">
                    {transaction.source}
                  </span>
                </div>
                {transaction.method === "Banco" && transaction.bankName ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Banco</span>
                    <span className="text-sm font-medium">
                      {transaction.bankName}
                      {transaction.bankAccountNumber ? ` · ${transaction.bankAccountNumber}` : ""}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Fecha</span>
                  <span className="text-sm font-medium">
                    {new Date(transaction.confirmedAt).toLocaleDateString("es-EC")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Asiento sugerido</h3>
                <div className="space-y-2 rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium">Cuenta principal</p>
                      <p className="text-muted-foreground">
                        {transaction.method === "Tarjeta"
                          ? "Red de cobro / liquidación"
                          : "Caja / Banco según medio"}
                      </p>
                    </div>
                    <p className={transaction.flow === "Ingreso" ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                      {transaction.flow === "Ingreso" ? "Debe" : "Haber"} {formatMoney(transaction.amount)}
                    </p>
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium">Contrapartida</p>
                      <p className="text-muted-foreground">{transaction.kind} desde {transaction.source}</p>
                    </div>
                    <p className={transaction.flow === "Ingreso" ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                      {transaction.flow === "Ingreso" ? "Haber" : "Debe"} {formatMoney(transaction.amount)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El asiento es preliminar. Cuando conectemos contabilidad real, este detalle se sustituye por el asiento contable definitivo.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Vinculación</h3>
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
                  <p className="text-muted-foreground">Módulo origen</p>
                  <p className="font-medium">{transaction.sourceModule ?? "manual"}</p>
                  {transaction.sourceId ? (
                    <>
                      <p className="mt-3 text-muted-foreground">Referencia</p>
                      <p className="font-medium font-mono text-xs break-all">{transaction.sourceId}</p>
                      {transaction.sourceModule && transaction.sourceId ? (
                        <Link
                          href={
                            transaction.sourceModule === "ordenes"
                              ? `/ordenes?orderId=${encodeURIComponent(transaction.sourceId)}`
                              : transaction.sourceModule === "ventas"
                                ? `/ventas?saleId=${encodeURIComponent(transaction.sourceId)}`
                                : transaction.sourceModule === "compras"
                                  ? `/compras?purchaseId=${encodeURIComponent(transaction.sourceId)}`
                                  : "#"
                          }
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}
                        >
                          Ver documento origen
                        </Link>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </SheetPanel>

            <SheetFooter variant="bare">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
                {transaction.method === "Banco" && transaction.status !== "Anulada" ? (
                  <ReversalButton transactionId={transaction.id} />
                ) : null}
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetPopup>
    </Sheet>
  );
}

function ReversalButton({ transactionId }: { transactionId: string }) {
  const reverseTransaction = useMutation(api.finances.reverseTransaction);
  const [reversing, setReversing] = useState(false);

  const handleReverse = async () => {
    if (reversing) return;
    setReversing(true);
    try {
      await reverseTransaction({ transactionId: transactionId as Id<"finance_transactions"> });
    } finally {
      setReversing(false);
    }
  };

  return (
    <Button type="button" variant="destructive" disabled={reversing} onClick={handleReverse}>
      {reversing ? "Revirtiendo..." : "Revertir"}
    </Button>
  );
}
