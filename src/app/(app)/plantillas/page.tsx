"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import {
  type BlockTemplate,
  defaultBlockTemplates,
  generateHtmlFromBlocks,
} from "@/lib/block-templates";
import { BlockEditor } from "@/components/plantillas/block-editor";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";

function blocksToHtmlTemplates(blockTemplates: BlockTemplate[]) {
  return blockTemplates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    kind: tpl.kind,
    format: "html" as const,
    content: generateHtmlFromBlocks(tpl.blocks, tpl.kind),
    updatedAt: Date.now(),
  }));
}

function loadBlockTemplates(raw: string | undefined | null): BlockTemplate[] {
  if (!raw) return defaultBlockTemplates();
  try {
    const parsed = JSON.parse(raw) as BlockTemplate[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore malformed
  }
  return defaultBlockTemplates();
}

export default function Plantillas2Page() {
  const { orgId } = useOrg();
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const saveSettings = useMutation(api.organizations.upsertSettings);
  const [saving, setSaving] = useState(false);

  const storedTemplates = useMemo(
    () => loadBlockTemplates(settings?.blockTemplates),
    [settings?.blockTemplates],
  );

  const [templates, setTemplates] = useState<BlockTemplate[] | null>(null);
  const activeTemplates = templates ?? storedTemplates;

  // Sync from server when first loaded (only if local state not yet set)
  useMemo(() => {
    if (templates === null && settings !== undefined) {
      setTemplates(loadBlockTemplates(settings?.blockTemplates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.blockTemplates]);

  const handleSave = async () => {
    if (!orgId || settings === undefined) return;
    setSaving(true);
    try {
      await saveSettings({
        orgId,
        commercialName: settings?.commercialName ?? "Mi Empresa",
        fiscalName: settings?.fiscalName,
        taxRate: settings?.taxRate ?? 0,
        zeroTaxRate: settings?.zeroTaxRate ?? 0,
        roundingMode: settings?.roundingMode ?? "none",
        currency: settings?.currency ?? "USD",
        enabledPaymentMethods: settings?.enabledPaymentMethods ?? ["Efectivo"],
        profitPlans: settings?.profitPlans ?? [],
        defaultProfitPlanId: settings?.defaultProfitPlanId,
        orderTemplate: settings?.orderTemplate,
        saleTemplate: settings?.saleTemplate,
        blockTemplates: JSON.stringify(activeTemplates),
        templates: blocksToHtmlTemplates(activeTemplates),
      });
      toastManager.add({ type: "success", title: "Guardado", description: "Las plantillas se actualizaron." });
    } catch (err) {
      console.error(err);
      toastManager.add({ type: "error", title: "Error", description: "No se pudo guardar." });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = settings === undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Plantillas">
        <Button type="button" size="sm" disabled={saving || isLoading} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar plantillas"}
        </Button>
      </AppHeader>

      <div className="flex flex-1 min-h-0 flex-col p-4 sm:p-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Cargando plantillas...
          </div>
        ) : (
          <BlockEditor templates={activeTemplates} onChange={setTemplates} />
        )}
      </div>
    </div>
  );
}
