"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import type { ProfitPlan } from "./types";

type Props = {
  visible: boolean;
  formId?: string;
  title: string;
  description: string;
  profitPlans: ProfitPlan[];
  defaultProfitPlanId?: string;
  onSave: (next: { profitPlans: ProfitPlan[]; defaultProfitPlanId?: string }) => Promise<void>;
};

export function InventarioSettingsSection({ visible, formId, title, description, profitPlans, defaultProfitPlanId, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<ProfitPlan[]>(profitPlans);
  const [defaultPlanId, setDefaultPlanId] = useState(defaultProfitPlanId || plans[0]?.id || "");
  const editablePlans = Array.from({ length: 3 }, (_, index) => plans[index] ?? {
    id: `plan-${index + 1}`,
    name: ["Plan 1", "Plan 2", "Plan 3"][index],
    percentage: [20, 35, 50][index],
    rounding: "nearest" as const,
  });

  if (!visible) return null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <form
        id={formId}
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave({ profitPlans: editablePlans, defaultProfitPlanId: defaultPlanId || undefined });
            toastManager.add({ type: "success", title: "Guardado", description: "Los planes de rentabilidad se actualizaron." });
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
            <span className="text-sm font-medium">Plan por defecto</span>
            <select className="h-9 rounded-lg border bg-background px-3 text-sm" value={defaultPlanId} onChange={(e) => setDefaultPlanId(e.target.value)}>
              {editablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name} · {plan.percentage}%</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Planes de rentabilidad</h3>
            <div className="space-y-3">
              {editablePlans.map((plan, index) => (
                <div key={plan.id} className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Label htmlFor={`profit-plan-name-${index}`}>Nombre</Label>
                      <Input
                        id={`profit-plan-name-${index}`}
                        value={plan.name}
                        onChange={(e) => {
                          const next = [...plans];
                          next[index] = { ...plan, id: plan.id, name: e.target.value };
                          setPlans(next);
                        }}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label htmlFor={`profit-plan-percentage-${index}`}>Porcentaje</Label>
                      <Input
                        id={`profit-plan-percentage-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={plan.percentage}
                        onChange={(e) => {
                          const next = [...plans];
                          next[index] = { ...plan, id: plan.id, percentage: Number(e.target.value || "0") };
                          setPlans(next);
                        }}
                      />
                    </div>
                    <div className="w-36 space-y-2">
                      <Label htmlFor={`profit-plan-rounding-${index}`}>Redondeo</Label>
                      <select
                        id={`profit-plan-rounding-${index}`}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                        value={plan.rounding}
                        onChange={(e) => {
                          const next = [...plans];
                          next[index] = { ...plan, id: plan.id, rounding: e.target.value as ProfitPlan["rounding"] };
                          setPlans(next);
                        }}
                      >
                        <option value="none">Sin redondeo</option>
                        <option value="nearest">Al más cercano</option>
                        <option value="up">Hacia arriba</option>
                        <option value="down">Hacia abajo</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
