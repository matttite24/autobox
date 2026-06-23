"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import type { AppNotification, NotificationSeverity } from "@convex/notifications";
import {
  Sheet,
  SheetPopup,
  SheetHeader,
  SheetTitle,
  SheetPanel,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Alert01Icon,
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  PackageIcon,
  Task01Icon,
  ShoppingBag01Icon,
  AddMoneyCircleIcon,
  Cancel01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

// ── Dismissed storage ─────────────────────────────────────────────────────────

const LS_KEY = "autobox:dismissed-notifications";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const SEVERITY_STYLES: Record<NotificationSeverity, { icon: React.ReactNode; ring: string; dot: string }> = {
  error: {
    icon: <Alert01Icon className="size-4 text-red-500" />,
    ring: "border-red-500/20 bg-red-500/5",
    dot: "bg-red-500",
  },
  warning: {
    icon: <Alert01Icon className="size-4 text-amber-500" />,
    ring: "border-amber-500/20 bg-amber-500/5",
    dot: "bg-amber-500",
  },
  info: {
    icon: <InformationCircleIcon className="size-4 text-sky-500" />,
    ring: "border-sky-500/20 bg-sky-500/5",
    dot: "bg-sky-500",
  },
};

const KIND_ICON: Record<AppNotification["kind"], React.ReactNode> = {
  caja_abierta:      <AddMoneyCircleIcon className="size-4 text-muted-foreground" />,
  orden_sin_iniciar: <Task01Icon className="size-4 text-muted-foreground" />,
  orden_lista:       <Task01Icon className="size-4 text-muted-foreground" />,
  compra_vencida:    <ShoppingBag01Icon className="size-4 text-muted-foreground" />,
  stock_bajo:        <PackageIcon className="size-4 text-muted-foreground" />,
};

const GROUP_LABELS: Record<NotificationSeverity, string> = {
  error: "Urgente",
  warning: "Advertencias",
  info: "Informativo",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onNavigate,
  onDismiss,
}: {
  notification: AppNotification;
  onNavigate: (href: string) => void;
  onDismiss: (id: string) => void;
}) {
  const style = SEVERITY_STYLES[notification.severity];
  return (
    <div className={cn("group relative flex items-start gap-3 rounded-xl border p-3 transition-colors", style.ring)}>
      <div className="mt-0.5 shrink-0">{style.icon}</div>

      <button
        type="button"
        onClick={() => onNavigate(notification.href)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          {KIND_ICON[notification.kind]}
          <p className="truncate text-[13px] font-semibold text-foreground">
            {notification.title}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {notification.description}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          {relativeTime(notification.triggeredAt)}
        </p>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Ignorar notificación"
          onClick={() => onDismiss(notification.id)}
          className="rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-muted-foreground group-hover:opacity-100"
        >
          <Cancel01Icon className="size-3.5" />
        </button>
        <ArrowRight01Icon
          onClick={() => onNavigate(notification.href)}
          className="size-4 cursor-pointer text-muted-foreground/40 transition-transform hover:translate-x-0.5"
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationsSheet({
  open,
  onOpenChange,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: Id<"organizations">;
}) {
  const router = useRouter();
  const notifications = useQuery(api.notifications.get, { orgId });
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const allIds = new Set((notifications ?? []).map((n) => n.id));
    setDismissed((prev) => {
      const next = new Set([...prev, ...allIds]);
      saveDismissed(next);
      return next;
    });
  }, [notifications]);

  const handleNavigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const visible = (notifications ?? []).filter((n) => !dismissed.has(n.id));

  const grouped = (["error", "warning", "info"] as NotificationSeverity[])
    .map((severity) => ({
      severity,
      items: visible.filter((n) => n.severity === severity),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup side="right" className="sm:max-w-sm">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <SheetTitle>Notificaciones</SheetTitle>
            {visible.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                {visible.length > 99 ? "99+" : visible.length}
              </span>
            )}
          </div>
        </SheetHeader>

        <SheetPanel>
          {notifications === undefined ? (
            // Loading
            <div className="space-y-2.5 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckmarkCircle02Icon className="size-7 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Todo en orden</p>
                <p className="text-xs text-muted-foreground">
                  No hay alertas pendientes en este momento.
                </p>
              </div>
            </div>
          ) : (
            // Grouped notifications
            <div className="space-y-5 pt-1">
              {grouped.map(({ severity, items }) => (
                <div key={severity} className="space-y-2">
                  <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {GROUP_LABELS[severity]}
                  </p>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onNavigate={handleNavigate}
                        onDismiss={dismiss}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetPanel>

        {visible.length > 1 && (
          <SheetFooter variant="bare">
            <Button variant="ghost" size="sm" onClick={dismissAll} className="text-muted-foreground/60 hover:text-muted-foreground">
              Ignorar todas
            </Button>
          </SheetFooter>
        )}
      </SheetPopup>
    </Sheet>
  );
}

// ── Badge count export (used by sidebar) ──────────────────────────────────────

export function useNotificationCount(orgId: Id<"organizations"> | undefined) {
  const notifications = useQuery(
    api.notifications.get,
    orgId ? { orgId } : "skip"
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => { setDismissed(loadDismissed()); }, []);
  if (!notifications) return 0;
  return notifications.filter((n) => !dismissed.has(n.id)).length;
}
