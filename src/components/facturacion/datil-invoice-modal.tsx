"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FacturacionSource = "orden" | "venta";

export function DatilInvoiceModal({
  orgId,
  sourceType,
  sourceId,
  label,
  title,
  summary,
  trigger,
  onSuccess,
}: {
  orgId: Id<"organizations">;
  sourceType: FacturacionSource;
  sourceId: string;
  label: string;
  title: string;
  summary: Array<{ label: string; value: string }>;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const issueInvoice = useAction(api.datil.issueInvoice);
  const orgSettings = useQuery(api.organizations.settings, { orgId });
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const statusText = useMemo(() => {
    if (status === "sending") return "Enviando a Datil...";
    if (status === "success") return "Factura enviada correctamente.";
    if (status === "error") return message || "No se pudo enviar.";
    return "Listo para enviar.";
  }, [message, status]);

  const handleSend = async () => {
    setSending(true);
    setStatus("sending");
    setMessage("");
    try {
      await issueInvoice({ sourceType, sourceId });
      setStatus("success");
      setMessage("Proceso completado.");
      onSuccess?.();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Confirma el envío a Datil. Este proceso correrá en sandbox y reintentará automáticamente hasta 3 veces si hay un fallo temporal.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{label}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
              Facturar
            </span>
          </div>
          {summary.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-right font-medium">{row.value}</span>
            </div>
          ))}
          <div className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
            Estado: <span className="font-medium text-foreground">{statusText}</span>
          </div>
        </div>

        {!(orgSettings?.datilApiKey && orgSettings?.datilCertPassword) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Las credenciales de Datil no están configuradas.{" "}
            <a href="/ajustes?section=facturacion" className="font-medium underline underline-offset-2">
              Configúralas en Ajustes
            </a>{" "}
            antes de facturar.
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" type="button" disabled={sending}>Cancelar</Button>} />
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || status === "success" || !(orgSettings?.datilApiKey && orgSettings?.datilCertPassword)}
          >
            {sending ? "Enviando..." : "Enviar a Datil"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
