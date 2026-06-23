"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7 días", days: 7 },
  { label: "14 días", days: 14 },
  { label: "30 días", days: 30 },
] as const;

function startOfDayUTC(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatCurrency(v: number) {
  return `$${v.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(dateStr: string) {
  // "2026-06-23" → "Jun 23"
  const [, m, d] = dateStr.split("-");
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-xl border bg-popover px-3 py-2.5 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex justify-between gap-4 text-xs border-t mt-1.5 pt-1.5">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}

export function RevenueChart({ orgId }: { orgId: Id<"organizations"> }) {
  const [days, setDays] = useState<7 | 14 | 30>(14);

  const { from, to } = useMemo(() => {
    const now = new Date();
    const to = startOfDayUTC(now) + 86400_000; // end of today (exclusive)
    const from = to - days * 86400_000;
    return { from, to };
  }, [days]);

  const data = useQuery(api.reports.dailyRevenue, { orgId, from, to });

  const totals = useMemo(() => {
    if (!data) return { ventas: 0, ordenes: 0, total: 0 };
    return data.reduce(
      (acc, d) => ({
        ventas: acc.ventas + d.ventas,
        ordenes: acc.ordenes + d.ordenes,
        total: acc.total + d.total,
      }),
      { ventas: 0, ordenes: 0, total: 0 }
    );
  }, [data]);

  const chartData = useMemo(
    () => (data ?? []).map((d) => ({ ...d, date: shortDate(d.date) })),
    [data]
  );

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base">Ingresos por día</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ventas directas + órdenes de trabajo completadas
          </p>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setDays(r.days as 7 | 14 | 30)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ventas", value: totals.ventas, color: "text-sky-600" },
          { label: "Órdenes", value: totals.ordenes, color: "text-violet-600" },
          { label: "Total", value: totals.total, color: "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={cn("text-sm font-bold tabular-nums mt-0.5", color)}>
              {data === undefined ? "…" : formatCurrency(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56">
        {data === undefined ? (
          <div className="flex h-full items-end gap-1.5 px-2">
            {Array.from({ length: days > 14 ? 15 : days }).map((_, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t bg-muted"
                style={{ height: `${30 + Math.random() * 50}%` }}
              />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={days === 30 ? 4 : days === 14 ? 1 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="ventas" name="Ventas" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ordenes" name="Órdenes" fill="hsl(262 80% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
