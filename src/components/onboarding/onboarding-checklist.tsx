"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useOrg } from "@/components/providers/org-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ContactBookIcon,
  PackageIcon,
  ShoppingBag01Icon,
  BankIcon,
  Cash02Icon,
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  RocketIcon,
} from "hugeicons-react";

type OnboardingStatus = {
  hasClient: boolean;
  hasProduct: boolean;
  hasPurchase: boolean;
  hasBank: boolean;
  hasCashSession: boolean;
};

interface Step {
  key: keyof OnboardingStatus;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    key: "hasClient",
    label: "Añade un cliente o proveedor",
    description: "Registra tu primera persona de contacto.",
    href: "/clientes?new=1",
    icon: ContactBookIcon,
  },
  {
    key: "hasProduct",
    label: "Añade un producto al inventario",
    description: "Carga los productos o repuestos que manejas.",
    href: "/inventario",
    icon: PackageIcon,
  },
  {
    key: "hasPurchase",
    label: "Registra tu primera compra",
    description: "Lleva el control de tus compras a proveedores.",
    href: "/compras",
    icon: ShoppingBag01Icon,
  },
  {
    key: "hasBank",
    label: "Configura una cuenta bancaria",
    description: "Necesaria para registrar cobros y transferencias.",
    href: "/finanzas",
    icon: BankIcon,
  },
  {
    key: "hasCashSession",
    label: "Abre tu primera caja del día",
    description: "Inicia el control de efectivo diario.",
    href: "/inicio",
    icon: Cash02Icon,
  },
];

export function OnboardingChecklist() {
  const { orgId } = useOrg();
  const status = useQuery(
    api.onboarding.getStatus,
    orgId ? { orgId: orgId as Id<"organizations"> } : "skip"
  ) as OnboardingStatus | undefined;

  if (status === undefined) return null;

  const completed = STEPS.filter((s) => status[s.key]).length;
  const total = STEPS.length;
  const allDone = completed === total;

  if (allDone) return null;

  const progress = Math.round((completed / total) * 100);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationFillMode: "both" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <RocketIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Primeros pasos</p>
              <p className="text-xs text-muted-foreground">
                {completed} de {total} completados
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary tabular-nums">
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y">
        {STEPS.map((step) => {
          const done = status[step.key];
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={done ? "#" : step.href}
              className={cn(
                "group flex items-center gap-3 px-5 py-3 transition-colors",
                done
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-muted/40 cursor-pointer"
              )}
            >
              {/* Check / Icon */}
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  done
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border bg-muted/30"
                )}
              >
                {done ? (
                  <CheckmarkCircle01Icon className="size-3.5 text-emerald-500" />
                ) : (
                  <Icon className="size-3.5 text-muted-foreground" />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    done ? "line-through text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.label}
                </p>
                {!done && (
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Arrow */}
              {!done && (
                <ArrowRight01Icon className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
