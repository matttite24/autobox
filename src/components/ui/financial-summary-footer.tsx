"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FinancialSummaryFooterProps = {
  subtotal: number;
  iva: number;
  balance: number;
  taxRate?: number;
  className?: string;
  children: ReactNode;
};

export function FinancialSummaryFooter({
  subtotal,
  iva,
  balance,
  taxRate = 15,
  className,
  children,
}: FinancialSummaryFooterProps) {
  const [showPaidView, setShowPaidView] = useState(false);
  const balanceValue = Math.abs(balance);
  const displayValue = showPaidView ? subtotal + iva - balance : balanceValue;
  const displayLabel = showPaidView
    ? "Saldo pagado"
    : balance > 0
      ? "Saldo pendiente"
      : balance < 0
        ? "Saldo a favor"
        : "Saldo al día";
  const displayPrefix = showPaidView ? "-" : balance > 0 ? "" : balance < 0 ? "-" : "";

  return (
    <div className={cn("flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>IVA ({taxRate}%)</span>
          <span>${iva.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between font-medium text-foreground">
          <span>Total</span>
          <span>${(subtotal + iva).toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="flex items-center justify-between border-t border-dashed pt-2 text-left transition-opacity hover:opacity-80"
          onClick={() => setShowPaidView((current) => !current)}
          title={showPaidView ? "Ver saldo pendiente" : "Ver saldo pagado"}
        >
          <span className="font-medium text-muted-foreground">{displayLabel}</span>
          <span className={`text-xl font-bold ${showPaidView ? "text-emerald-500" : balance > 0 ? "text-foreground" : "text-emerald-500"}`}>
            {displayPrefix}${displayValue.toFixed(2)}
          </span>
        </button>
      </div>

      <div className="grid w-full gap-2 sm:w-44">{children}</div>
    </div>
  );
}
