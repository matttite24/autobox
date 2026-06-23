"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { cn } from "@/lib/utils";
import { ArrowRight01Icon } from "hugeicons-react";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function DailyCashWidget() {
  const { orgId } = useOrg();
  const { isAuthenticated } = useConvexAuth();

  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = new Date().setHours(23, 59, 59, 999);

  const dashboard = useQuery(
    api.finances.getDashboard,
    isAuthenticated && orgId ? { orgId, from: todayStart, to: todayEnd } : "skip",
  );

  const isOpen = dashboard?.session?.status === "open";
  const openingDate = dashboard?.session?.openingDate;
  const openedBy = dashboard?.session?.openedBy;
  const efectivo = dashboard?.totals?.efectivo ?? 0;
  const closing = dashboard?.totals?.closing ?? 0;

  return (
    <Link href="/finanzas" className="group block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[1.25rem]">
      <div
        className={cn(
          "flex flex-col gap-5 rounded-[1.25rem] border p-6 w-full shadow-sm h-full transition-colors",
          isOpen
            ? "border-emerald-500/20 bg-emerald-500/5 group-hover:border-emerald-500/40"
            : "border-zinc-200 bg-zinc-100/70 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 group-hover:border-zinc-300 dark:group-hover:border-zinc-700"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Caja diaria</p>
            {isOpen && openingDate ? (
              <div className="text-sm font-medium text-foreground">
                <p>Abierta el {new Date(openingDate).toLocaleDateString("es-EC")}</p>
                {openedBy ? <p className="text-xs text-muted-foreground font-normal">Por {openedBy}</p> : null}
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">La caja está cerrada.</p>
            )}
          </div>

          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0",
            isOpen
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          )}>
            {isOpen ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <div className="grid gap-3 grid-cols-2 mt-auto pt-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Efectivo hoy</p>
            <p className="text-lg font-bold text-foreground mt-1">{formatMoney(efectivo)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo actual</p>
            <p className="text-lg font-bold text-foreground mt-1">{formatMoney(closing)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors mt-auto pt-1 border-t border-border/40">
          <ArrowRight01Icon className="size-3.5" />
          <span>{isOpen ? "Ir a Finanzas para gestionar la caja" : "Ir a Finanzas para abrir la caja"}</span>
        </div>
      </div>
    </Link>
  );
}
