import type { Metadata } from "next";
import Link from "next/link";
import {
  PlusSignIcon,
  ContactBookIcon,
  ShoppingCart01Icon,
  Car01Icon,
  Wrench01Icon,
  Settings01Icon,
  Task01Icon,
  DashboardSpeed01Icon,
  PaintBoardIcon,
  Tag01Icon,
} from "hugeicons-react";

import { DailyCashWidget } from "@/components/finanzas/daily-cash-widget";
import { RevenueChartWidget } from "@/components/reports/revenue-chart-widget";
import { GreetingMessage } from "./greeting";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Inicio - Autobox",
  description: "Panel de inicio del sistema",
};

const quickActions = [
  {
    label: "Nueva orden",
    href: "/ordenes?new=1",
    icon: PlusSignIcon,
    tone: "from-sky-500/15 to-sky-500/5",
    description: "Crear una nueva orden de servicio",
  },
  {
    label: "Nueva venta",
    href: "/ventas?new=1",
    icon: ShoppingCart01Icon,
    tone: "from-emerald-500/15 to-emerald-500/5",
    description: "Registrar una venta directa",
  },
  {
    label: "Nueva persona",
    href: "/clientes?new=1",
    icon: ContactBookIcon,
    tone: "from-amber-500/15 to-amber-500/5",
    description: "Añadir cliente o proveedor",
  },
];

export default function InicioPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-1 flex-col px-4 py-6 sm:px-6 md:items-center md:justify-center">
      <div className="absolute left-4 top-4 z-50 md:hidden">
        <SidebarTrigger className="h-10 w-10 border bg-background/50 backdrop-blur-sm" />
      </div>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.045] dark:opacity-[0.055]">
        <Car01Icon          className="absolute text-foreground" style={{ width: 120, height: 120, top: "8%",  left: "6%" }} />
        <Wrench01Icon       className="absolute text-foreground" style={{ width: 80,  height: 80,  top: "5%",  left: "38%" }} />
        <Settings01Icon     className="absolute text-foreground" style={{ width: 100, height: 100, top: "12%", right: "8%" }} />
        <DashboardSpeed01Icon className="absolute text-foreground" style={{ width: 90, height: 90, top: "42%", left: "3%" }} />
        <Tag01Icon          className="absolute text-foreground" style={{ width: 70,  height: 70,  top: "38%", left: "28%" }} />
        <Task01Icon         className="absolute text-foreground" style={{ width: 85,  height: 85,  top: "35%", right: "5%" }} />
        <PaintBoardIcon     className="absolute text-foreground" style={{ width: 75,  height: 75,  bottom: "12%", left: "12%" }} />
        <Car01Icon          className="absolute text-foreground" style={{ width: 60,  height: 60,  bottom: "8%",  left: "44%" }} />
        <Wrench01Icon       className="absolute text-foreground" style={{ width: 95,  height: 95,  bottom: "10%", right: "6%" }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl space-y-6 sm:space-y-8 pt-14 md:pt-0 md:mt-[-60px] pb-8">
        <section
          className="animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ animationFillMode: "both", animationDelay: "0ms" }}
        >
          <div className="text-left">
            <h1 className="text-balance">
              <GreetingMessage />
            </h1>
          </div>
        </section>

        <section className="grid gap-6 grid-cols-1 md:grid-cols-2 items-stretch">
          <div
            className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700"
            style={{ animationFillMode: "both", animationDelay: "150ms" }}
          >
            <DailyCashWidget />
          </div>

          <div className="flex flex-col gap-2.5 h-full justify-between">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex flex-1 items-center gap-3 rounded-[1.25rem] border border-border/60 bg-card px-4 py-3 transition-all duration-150 hover:border-primary/30 hover:shadow-sm animate-in fade-in slide-in-from-right-4 duration-700"
                  style={{ animationFillMode: "both", animationDelay: `${300 + index * 100}ms` }}
                >
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br ${action.tone} text-foreground`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="text-[13px] text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section
          className="animate-in fade-in slide-in-from-bottom-6 duration-700"
          style={{ animationFillMode: "both", animationDelay: "600ms" }}
        >
          <RevenueChartWidget />
        </section>
      </div>
    </main>
  );
}
