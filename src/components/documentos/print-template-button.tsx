"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { TemplatePickerDialog } from "./template-picker-dialog";
import { defaultBlockTemplates, generateHtmlFromBlocks } from "@/lib/block-templates";
import { type TemplateRecord } from "@/lib/document-templates";

function resolveTemplates(htmlTemplates: TemplateRecord[] | undefined | null): TemplateRecord[] {
  if (htmlTemplates && htmlTemplates.length > 0) return htmlTemplates;
  return defaultBlockTemplates().map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    kind: tpl.kind,
    format: "html" as const,
    content: generateHtmlFromBlocks(tpl.blocks, tpl.kind),
    updatedAt: Date.now(),
  }));
}

function PrintingOverlay({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "autobox-print-ready") onDismiss();
    };
    window.addEventListener("message", handleMessage);
    // Fallback: dismiss after 8s in case postMessage doesn't fire
    const fallback = window.setTimeout(onDismiss, 8000);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(fallback);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-8 py-6 shadow-2xl dark:bg-zinc-900">
        <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preparando documento...</p>
      </div>
    </div>
  );
}

const KIND_TO_TEMPLATE: Record<string, "orden" | "cotizacion" | "venta" | "etiqueta" | "ticket" | "custom"> = {
  orden: "orden",
  cotizacion: "cotizacion",
  venta: "venta",
  compra: "venta",
  etiqueta: "etiqueta",
  ticket: "ticket",
};

export function PrintTemplateButton({
  kind,
  id,
  orgId,
  label = "Imprimir",
  variant = "outline",
}: {
  kind: "orden" | "cotizacion" | "venta" | "compra" | "etiqueta" | "ticket";
  id: string;
  orgId: string;
  label?: string;
  variant?: "outline" | "ghost" | "default";
}) {
  const settings = useQuery(api.organizations.settings, orgId ? { orgId: orgId as Id<"organizations"> } : "skip");
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const allTemplates = resolveTemplates(settings?.templates);
  const templateKind = KIND_TO_TEMPLATE[kind] ?? "custom";
  // Filter templates matching this kind (fall back to all if none match)
  const matchingTemplates = allTemplates.filter((t) => t.kind === templateKind);
  const templates = matchingTemplates.length > 0 ? matchingTemplates : allTemplates;

  useEffect(() => {
    return () => {
      frameRef.current?.remove();
      frameRef.current = null;
    };
  }, []);

  const printInFrame = (url: string) => {
    frameRef.current?.remove();

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = url;

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;
        win.addEventListener("afterprint", () => {
          setTimeout(() => {
            iframe.remove();
            if (frameRef.current === iframe) frameRef.current = null;
          }, 1000);
        }, { once: true });
      } catch {
        // ignore cross-window quirks
      }
    };

    document.body.appendChild(iframe);
    frameRef.current = iframe;
  };

  return (
    <>
      {printing && <PrintingOverlay onDismiss={() => setPrinting(false)} />}
      <Button variant={variant} className="w-full" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <TemplatePickerDialog
        open={open}
        onOpenChange={setOpen}
        templates={templates}
        onSelect={(template) => {
          setOpen(false);
          setPrinting(true);
          printInFrame(`/documentos/imprimir?kind=${kind}&id=${id}&templateId=${template.id}`);
        }}
      />
    </>
  );
}
