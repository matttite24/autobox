"use client";

import { useState, useCallback, useRef } from "react";
import {
  type AnyBlock,
  type BlockTemplate,
  type BlockType,
  type TemplateKind,
  type HeaderConfig,
  type DocMetaConfig,
  type SectionConfig,
  type ClientConfig,
  type VehicleConfig,
  type DiagnosisConfig,
  type ItemsTableConfig,
  type TotalsConfig,
  type BillingConfig,
  type TextConfig,
  type SpacerConfig,
  type ChecklistConfig,
  type SignatureConfig,
  type VehicleConditionConfig,
  type ProductInfoConfig,
  type ProductPriceConfig,
  type BarcodeConfig,
  type TicketHeaderConfig,
  type TicketItemsConfig,
  type TicketTotalsConfig,
  type TicketFooterConfig,
  BLOCK_META,
  makeBlock,
  generateHtmlFromBlocks,
  defaultOrderBlocks,
  defaultCotizacionBlocks,
  defaultSaleBlocks,
  defaultLabelBlocks,
  defaultTicketBlocks,
  DOC_SHARED_CSS,
  TICKET_PRINT_CSS,
  LABEL_PRINT_CSS,
  JSBARCODE_INIT_SCRIPT,
} from "@/lib/block-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---- helpers ----------------------------------------------------------------

// ---- block config editors ---------------------------------------------------

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function BlockConfigEditor({ block, onChange }: { block: AnyBlock; onChange: (cfg: AnyBlock["config"]) => void }) {
  const update = useCallback(
    (patch: Partial<AnyBlock["config"]>) => onChange({ ...block.config, ...patch } as AnyBlock["config"]),
    [block.config, onChange],
  );

  switch (block.type) {
    case "header": {
      const cfg = block.config as HeaderConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Nombre del negocio" checked={cfg.showOrgName} onChange={(v) => update({ showOrgName: v })} />
          <Toggle label="Razón social" checked={cfg.showFiscalName} onChange={(v) => update({ showFiscalName: v })} />
        </div>
      );
    }

    case "doc-meta": {
      const cfg = block.config as DocMetaConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Número" checked={cfg.showNumber} onChange={(v) => update({ showNumber: v })} />
          <Toggle label="Estado" checked={cfg.showStatus} onChange={(v) => update({ showStatus: v })} />
          <Toggle label="Fecha de creación" checked={cfg.showCreatedAt} onChange={(v) => update({ showCreatedAt: v })} />
          <Toggle label="Última actualización" checked={cfg.showUpdatedAt} onChange={(v) => update({ showUpdatedAt: v })} />
        </div>
      );
    }

    case "section": {
      const cfg = block.config as SectionConfig;
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={cfg.title} onChange={(e) => update({ title: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="flex gap-1.5">
            {(["h2", "h3"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => update({ level: l })}
                className={cn("rounded-lg border px-3 py-1 text-xs font-medium", cfg.level === l ? "border-primary bg-primary/10" : "border-border")}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "client": {
      const cfg = block.config as ClientConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Nombre" checked={cfg.showName} onChange={(v) => update({ showName: v })} />
          <Toggle label="Documento / ID" checked={cfg.showDocumentId} onChange={(v) => update({ showDocumentId: v })} />
          <Toggle label="Teléfono" checked={cfg.showPhone} onChange={(v) => update({ showPhone: v })} />
          <Toggle label="Correo" checked={cfg.showEmail} onChange={(v) => update({ showEmail: v })} />
          <Toggle label="Empresa" checked={cfg.showCompany} onChange={(v) => update({ showCompany: v })} />
        </div>
      );
    }

    case "vehicle": {
      const cfg = block.config as VehicleConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Marca" checked={cfg.showMake} onChange={(v) => update({ showMake: v })} />
          <Toggle label="Modelo" checked={cfg.showModel} onChange={(v) => update({ showModel: v })} />
          <Toggle label="Año" checked={cfg.showYear} onChange={(v) => update({ showYear: v })} />
          <Toggle label="Placa" checked={cfg.showPlate} onChange={(v) => update({ showPlate: v })} />
          <Toggle label="Color" checked={cfg.showColor} onChange={(v) => update({ showColor: v })} />
          <Toggle label="VIN / Chasis" checked={cfg.showVin} onChange={(v) => update({ showVin: v })} />
          <Toggle label="Kilometraje de ingreso" checked={cfg.showMileage} onChange={(v) => update({ showMileage: v })} />
        </div>
      );
    }

    case "diagnosis": {
      const cfg = block.config as DiagnosisConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Síntomas" checked={cfg.showSymptoms} onChange={(v) => update({ showSymptoms: v })} />
          <Toggle label="Inspección" checked={cfg.showInspection} onChange={(v) => update({ showInspection: v })} />
          <Toggle label="Próximo servicio" checked={cfg.showNextMileage} onChange={(v) => update({ showNextMileage: v })} />
        </div>
      );
    }

    case "items-table": {
      const cfg = block.config as ItemsTableConfig;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Visualización</Label>
            <div className="flex gap-1.5">
              {(["mixed", "grouped"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update({ display: d })}
                  className={cn("rounded-lg border px-3 py-1 text-xs", (cfg.display ?? "mixed") === d ? "border-primary bg-primary/10 font-medium" : "border-border")}
                >
                  {d === "mixed" ? "Lista mixta" : "Por tipo"}
                </button>
              ))}
            </div>
          </div>
          {(cfg.display ?? "mixed") === "mixed" && (
            <Toggle label="Mostrar columna Tipo" checked={cfg.showType} onChange={(v) => update({ showType: v })} />
          )}
        </div>
      );
    }

    case "payments-table":
      return <p className="text-xs text-muted-foreground">Muestra todos los pagos registrados.</p>;

    case "totals": {
      const cfg = block.config as TotalsConfig;
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Toggle label="Subtotal" checked={cfg.showSubtotal} onChange={(v) => update({ showSubtotal: v })} />
            <Toggle label="IVA" checked={cfg.showIva} onChange={(v) => update({ showIva: v })} />
            <Toggle label="Total" checked={cfg.showTotal} onChange={(v) => update({ showTotal: v })} />
            <Toggle label="Pagado" checked={cfg.showPaid} onChange={(v) => update({ showPaid: v })} />
            <Toggle label="Saldo" checked={cfg.showBalance} onChange={(v) => update({ showBalance: v })} />
          </div>
          <div className="space-y-1 border-t pt-2">
            <Label className="text-xs text-muted-foreground">Lado izquierdo</Label>
            <div className="flex gap-1.5">
              {(["none", "text", "signature"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update({ leftContent: opt })}
                  className={cn("rounded-lg border px-2.5 py-1 text-xs", (cfg.leftContent ?? "none") === opt ? "border-primary bg-primary/10 font-medium" : "border-border")}
                >
                  {opt === "none" ? "Vacío" : opt === "text" ? "Texto" : "Firma"}
                </button>
              ))}
            </div>
          </div>
          {(cfg.leftContent ?? "none") === "text" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Texto</Label>
              <textarea
                value={cfg.leftText ?? ""}
                onChange={(e) => update({ leftText: e.target.value })}
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="**Garantía:** 30 días en mano de obra."
              />
            </div>
          )}
          {(cfg.leftContent ?? "none") === "signature" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Etiqueta de firma</Label>
              <Input value={cfg.signatureLabel ?? ""} onChange={(e) => update({ signatureLabel: e.target.value })} className="h-8 text-xs" placeholder="Recibido conforme" />
            </div>
          )}
        </div>
      );
    }

    case "billing": {
      const cfg = block.config as BillingConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Estado" checked={cfg.showStatus} onChange={(v) => update({ showStatus: v })} />
          <Toggle label="Etiqueta" checked={cfg.showLabel} onChange={(v) => update({ showLabel: v })} />
          <Toggle label="ID de factura" checked={cfg.showInvoiceId} onChange={(v) => update({ showInvoiceId: v })} />
        </div>
      );
    }

    case "text": {
      const cfg = block.config as TextConfig;
      return (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Alineación</Label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => update({ align: a })} className={cn("rounded border px-2 py-1 text-xs", (cfg.align ?? "left") === a ? "border-primary bg-primary/10" : "border-border")}>
                    {a === "left" ? "←" : a === "center" ? "↔" : "→"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tamaño</Label>
              <div className="flex gap-1">
                {(["sm", "md", "lg"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => update({ size: s })} className={cn("rounded border px-2 py-1 text-xs", (cfg.size ?? "md") === s ? "border-primary bg-primary/10" : "border-border")}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <textarea
            value={cfg.content}
            onChange={(e) => update({ content: e.target.value })}
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={"Escribe aquí...\n**Negrita**, *cursiva*, {{organization.name}}"}
          />
        </div>
      );
    }

    case "spacer": {
      const cfg = block.config as SpacerConfig;
      return (
        <div className="flex gap-1.5">
          {(["sm", "md", "lg"] as const).map((s) => (
            <button key={s} type="button" onClick={() => update({ size: s })} className={cn("rounded-lg border px-3 py-1 text-xs", cfg.size === s ? "border-primary bg-primary/10 font-medium" : "border-border")}>
              {s === "sm" ? "Pequeño" : s === "md" ? "Mediano" : "Grande"}
            </button>
          ))}
        </div>
      );
    }

    case "checklist": {
      const cfg = block.config as ChecklistConfig;
      return (
        <div className="space-y-2">
          <Input value={cfg.title} onChange={(e) => update({ title: e.target.value })} className="h-8 text-xs" placeholder="Título (opcional)" />
          <div className="flex gap-1.5">
            {(["check", "bullet", "numbered"] as const).map((s) => (
              <button key={s} type="button" onClick={() => update({ style: s })} className={cn("rounded-lg border px-2 py-1 text-xs", cfg.style === s ? "border-primary bg-primary/10 font-medium" : "border-border")}>
                {s === "check" ? "☐ Casilla" : s === "bullet" ? "• Bullet" : "1. Número"}
              </button>
            ))}
          </div>
          <textarea
            value={cfg.items.join("\n")}
            onChange={(e) => update({ items: e.target.value.split("\n") })}
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Un ítem por línea"
          />
        </div>
      );
    }

    case "signature": {
      const cfg = block.config as SignatureConfig;
      const updateSlot = (i: number, patch: Partial<{ label: string; name: string }>) => {
        update({ slots: cfg.slots.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
      };
      return (
        <div className="space-y-2">
          <Input value={cfg.title} onChange={(e) => update({ title: e.target.value })} className="h-8 text-xs" placeholder="Título (opcional)" />
          <Toggle label="Mostrar campo de fecha" checked={cfg.showDate} onChange={(v) => update({ showDate: v })} />
          <div className="space-y-1.5">
            {cfg.slots.map((slot, i) => (
              <div key={`${slot.label}-${i}`} className="rounded-lg border p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Firmante {i + 1}</span>
                  {cfg.slots.length > 1 && (
                    <button type="button" onClick={() => update({ slots: cfg.slots.filter((_, idx) => idx !== i) })} className="text-xs text-muted-foreground hover:text-destructive">×</button>
                  )}
                </div>
                <Input value={slot.label} onChange={(e) => updateSlot(i, { label: e.target.value })} className="h-7 text-xs" placeholder="Etiqueta" />
                <Input value={slot.name} onChange={(e) => updateSlot(i, { name: e.target.value })} className="h-7 text-xs" placeholder="Nombre o cargo (opcional)" />
              </div>
            ))}
            {cfg.slots.length < 4 && (
              <button type="button" onClick={() => update({ slots: [...cfg.slots, { label: "Firmante", name: "" }] })} className="w-full rounded-lg border border-dashed py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                + Agregar firmante
              </button>
            )}
          </div>
        </div>
      );
    }

    case "vehicle-condition": {
      const cfg = block.config as VehicleConditionConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Nivel de combustible" checked={cfg.showFuelLevel} onChange={(v) => update({ showFuelLevel: v })} />
          <Toggle label="Daños exteriores" checked={cfg.showExteriorDamage} onChange={(v) => update({ showExteriorDamage: v })} />
          <Toggle label="Daños interiores" checked={cfg.showInteriorDamage} onChange={(v) => update({ showInteriorDamage: v })} />
          <Toggle label="Estado de neumáticos" checked={cfg.showTires} onChange={(v) => update({ showTires: v })} />
          <Toggle label="Km. de egreso" checked={cfg.showMileageOut} onChange={(v) => update({ showMileageOut: v })} />
          <Toggle label="Observaciones" checked={cfg.showObservations} onChange={(v) => update({ showObservations: v })} />
        </div>
      );
    }

    case "product-info": {
      const cfg = block.config as ProductInfoConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Nombre" checked={cfg.showName} onChange={(v) => update({ showName: v })} />
          <Toggle label="SKU" checked={cfg.showSku} onChange={(v) => update({ showSku: v })} />
          <Toggle label="Código interno" checked={cfg.showCode} onChange={(v) => update({ showCode: v })} />
          <Toggle label="Ubicación" checked={cfg.showLocation} onChange={(v) => update({ showLocation: v })} />
          <Toggle label="Categoría" checked={cfg.showCategory} onChange={(v) => update({ showCategory: v })} />
          <Toggle label="Descripción" checked={cfg.showDescription} onChange={(v) => update({ showDescription: v })} />
        </div>
      );
    }

    case "product-price": {
      const cfg = block.config as ProductPriceConfig;
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Etiqueta</Label>
            <Input value={cfg.label} onChange={(e) => update({ label: e.target.value })} className="h-8 text-xs" placeholder="Precio" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tamaño</Label>
            <div className="flex gap-1.5">
              {(["sm", "md", "lg"] as const).map((s) => (
                <button key={s} type="button" onClick={() => update({ size: s })} className={cn("rounded-lg border px-3 py-1 text-xs", (cfg.size ?? "lg") === s ? "border-primary bg-primary/10 font-medium" : "border-border")}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Mostrar precio de costo" checked={cfg.showCost} onChange={(v) => update({ showCost: v })} />
        </div>
      );
    }

    case "barcode": {
      const cfg = block.config as BarcodeConfig;
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mostrar como código</Label>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => update({ showSku: true, showCode: false })} className={cn("rounded-lg border px-3 py-1 text-xs", cfg.showSku ? "border-primary bg-primary/10 font-medium" : "border-border")}>SKU</button>
              <button type="button" onClick={() => update({ showSku: false, showCode: true })} className={cn("rounded-lg border px-3 py-1 text-xs", cfg.showCode && !cfg.showSku ? "border-primary bg-primary/10 font-medium" : "border-border")}>Código interno</button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Estilo</Label>
            <div className="flex gap-1.5">
              {(["lines", "box"] as const).map((s) => (
                <button key={s} type="button" onClick={() => update({ style: s })} className={cn("rounded-lg border px-3 py-1 text-xs", cfg.style === s ? "border-primary bg-primary/10 font-medium" : "border-border")}>
                  {s === "lines" ? "Barras" : "Caja"}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "ticket-header": {
      const cfg = block.config as TicketHeaderConfig;
      return (
        <div className="space-y-2">
          <Toggle label="Nombre del negocio" checked={cfg.showOrgName} onChange={(v) => update({ showOrgName: v })} />
          <Toggle label="Razón social" checked={cfg.showFiscalName} onChange={(v) => update({ showFiscalName: v })} />
          <Toggle label="Número de documento" checked={cfg.showDocNumber} onChange={(v) => update({ showDocNumber: v })} />
          <Toggle label="Fecha" checked={cfg.showDate} onChange={(v) => update({ showDate: v })} />
          <div className="flex gap-1.5 pt-1">
            {(["left", "center"] as const).map((a) => (
              <button key={a} type="button" onClick={() => update({ align: a })} className={cn("rounded-lg border px-3 py-1 text-xs", cfg.align === a ? "border-primary bg-primary/10 font-medium" : "border-border")}>
                {a === "left" ? "← Izquierda" : "↔ Centrado"}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "ticket-items": {
      const cfg = block.config as TicketItemsConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Mostrar tipo de ítem" checked={cfg.showType} onChange={(v) => update({ showType: v })} />
          <Toggle label="Compacto" checked={cfg.compact} onChange={(v) => update({ compact: v })} />
        </div>
      );
    }

    case "ticket-totals": {
      const cfg = block.config as TicketTotalsConfig;
      return (
        <div className="space-y-1">
          <Toggle label="Subtotal" checked={cfg.showSubtotal} onChange={(v) => update({ showSubtotal: v })} />
          <Toggle label="IVA" checked={cfg.showIva} onChange={(v) => update({ showIva: v })} />
          <Toggle label="Total" checked={cfg.showTotal} onChange={(v) => update({ showTotal: v })} />
          <Toggle label="Pagado" checked={cfg.showPaid} onChange={(v) => update({ showPaid: v })} />
          <Toggle label="Saldo" checked={cfg.showBalance} onChange={(v) => update({ showBalance: v })} />
        </div>
      );
    }

    case "ticket-footer": {
      const cfg = block.config as TicketFooterConfig;
      return (
        <div className="space-y-2">
          <Toggle label="Mostrar nombre del cliente" checked={cfg.showClientName} onChange={(v) => update({ showClientName: v })} />
          <Toggle label="Mostrar mensaje" checked={cfg.showThankYou} onChange={(v) => update({ showThankYou: v })} />
          {cfg.showThankYou && (
            <Input value={cfg.content} onChange={(e) => update({ content: e.target.value })} className="h-8 text-xs" placeholder="Gracias por su compra" />
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ---- block card -------------------------------------------------------------

function BlockCard({
  block,
  index,
  total,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChange,
}: {
  block: AnyBlock;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChange: (cfg: AnyBlock["config"]) => void;
}) {
  const meta = BLOCK_META[block.type];

  return (
    <div className={cn("rounded-xl border bg-background transition-all", selected ? "border-primary shadow-sm" : "border-border hover:border-muted-foreground/30")}>
      <div className="flex w-full items-center gap-2 px-3 py-2.5">
        {/* drag handle visual */}
        <div className="flex flex-col gap-0.5 shrink-0 opacity-30">
          <div className="w-3 h-px bg-foreground rounded" />
          <div className="w-3 h-px bg-foreground rounded" />
          <div className="w-3 h-px bg-foreground rounded" />
        </div>
        <button type="button" className="flex-1 min-w-0 text-left" onClick={onSelect}>
          <div className="font-medium text-sm leading-tight">{meta.label}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{meta.description}</div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-25" aria-label="Subir">↑</button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-25" aria-label="Bajar">↓</button>
          <button type="button" onClick={onDelete} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Eliminar">×</button>
        </div>
      </div>

      {selected && (
        <div className="border-t bg-muted/20 px-3 py-3 rounded-b-xl">
          <BlockConfigEditor block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ---- add block modal --------------------------------------------------------

const PALETTE_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: "Estructura", types: ["header", "separator", "spacer", "section"] },
  { label: "Datos", types: ["doc-meta", "client", "vehicle", "diagnosis", "vehicle-condition"] },
  { label: "Tablas", types: ["items-table", "payments-table", "totals", "billing"] },
  { label: "Contenido", types: ["text", "checklist", "signature"] },
  { label: "Etiqueta", types: ["product-info", "product-price", "barcode"] },
  { label: "Ticket térmico", types: ["ticket-header", "ticket-items", "ticket-totals", "ticket-footer"] },
];

function AddBlockModal({
  open,
  onClose,
  kind,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  kind: TemplateKind;
  onAdd: (type: BlockType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md w-full max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">Agregar bloque</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {PALETTE_GROUPS.map((group) => {
              const available = group.types.filter((t) => {
                const meta = BLOCK_META[t];
                return meta.availableFor === "all" || meta.availableFor.includes(kind);
              });
              if (!available.length) return null;
              return (
                <div key={group.label}>
                  <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {available.map((type) => {
                      const meta = BLOCK_META[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => { onAdd(type); onClose(); }}
                          className="flex flex-col items-start rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                        >
                          <div className="text-sm font-medium leading-tight">{meta.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{meta.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ---- HTML preview -----------------------------------------------------------

function HtmlPreview({ html, kind }: { html: string; kind: TemplateKind }) {
  const isTicket = kind === "ticket";
  const isLabel = kind === "etiqueta";
  const needsBarcode = isLabel;

  const bodyStyles = isTicket
    ? "margin:0;background:#f0f0f0;display:flex;justify-content:center;padding:12px;"
    : isLabel
    ? "margin:0;background:#f0f0f0;display:flex;justify-content:center;padding:16px;"
    : "margin:0;background:#e9e9e6;padding:20px;";

  const wrapperOpen = isTicket
    ? `<div style="width:80mm;background:white;padding:4px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`
    : isLabel
    ? `<div style="width:62mm;min-height:29mm;background:white;box-shadow:0 2px 12px rgba(0,0,0,0.12);overflow:hidden;">`
    : `<div class="doc-shell">`;

  const extraCss = isTicket ? TICKET_PRINT_CSS : isLabel ? LABEL_PRINT_CSS : "";

  // Preview uses sample values so barcodes render visually
  const previewHtml = html
    .replace(/data-value="\{\{product\.sku\}\}"/g, 'data-value="SKU-001"')
    .replace(/data-value="\{\{product\.code\}\}"/g, 'data-value="COD-001"');

  const srcDoc = [
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>`,
    `body { ${bodyStyles} }`,
    isTicket || isLabel ? "" : DOC_SHARED_CSS,
    extraCss,
    `</style></head><body>`,
    wrapperOpen,
    previewHtml,
    `</div>`,
    needsBarcode ? `<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>` : "",
    needsBarcode ? JSBARCODE_INIT_SCRIPT : "",
    `</body></html>`,
  ].join("\n");

  return (
    <iframe
      srcDoc={srcDoc}
      className="h-full w-full rounded-xl border bg-muted/20"
      title="Vista previa"
      // allow-scripts needed for JsBarcode to run in the preview iframe
      sandbox={needsBarcode ? "allow-scripts" : "allow-same-origin"}
    />
  );
}

// ---- new template dialog ----------------------------------------------------

function NewTemplateDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (tpl: BlockTemplate) => void;
}) {
  const [name, setName] = useState("Plantilla nueva");
  const [kind, setKind] = useState<TemplateKind>("orden");

  const handleCreate = () => {
    const defaultBlocksMap: Record<TemplateKind, () => AnyBlock[]> = {
      orden: defaultOrderBlocks,
      cotizacion: defaultCotizacionBlocks,
      venta: defaultSaleBlocks,
      etiqueta: defaultLabelBlocks,
      ticket: defaultTicketBlocks,
      custom: () => [],
    };
    onCreate({
      id: `tpl-${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim() || "Plantilla nueva",
      kind,
      blocks: defaultBlocksMap[kind](),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Nueva plantilla</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["orden", "cotizacion", "venta", "etiqueta", "ticket", "custom"] as TemplateKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs font-medium capitalize transition-colors",
                    kind === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {kind === "ticket" ? "Formato para impresora térmica de 80mm." : kind === "etiqueta" ? "Etiqueta de producto para inventario." : kind === "cotizacion" ? "Proforma / cotización sin pagos." : kind === "custom" ? "Sin bloques por defecto." : `Plantilla para documentos de ${kind}.`}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="button" size="sm" onClick={handleCreate}>Crear plantilla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- main component ---------------------------------------------------------

const KIND_LABELS: Record<TemplateKind, string> = {
  orden: "Orden de trabajo",
  cotizacion: "Cotización",
  venta: "Venta",
  etiqueta: "Etiqueta",
  ticket: "Ticket térmico",
  custom: "Libre",
};

type Props = {
  templates: BlockTemplate[];
  onChange: (templates: BlockTemplate[]) => void;
};

export function BlockEditor({ templates, onChange }: Props) {
  const [activeId, setActiveId] = useState<string>(templates[0]?.id ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [newTplOpen, setNewTplOpen] = useState(false);
  const blockListRef = useRef<HTMLDivElement>(null);

  const active = templates.find((t) => t.id === activeId) ?? templates[0];

  const updateTemplate = useCallback(
    (patch: Partial<BlockTemplate>) => {
      onChange(templates.map((t) => (t.id === active?.id ? { ...t, ...patch } : t)));
    },
    [active?.id, templates, onChange],
  );

  const updateBlocks = useCallback(
    (blocks: AnyBlock[]) => updateTemplate({ blocks }),
    [updateTemplate],
  );

  if (!active) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-sm">No hay plantillas. Crea una nueva para empezar.</p>
        <Button type="button" onClick={() => setNewTplOpen(true)}>Nueva plantilla</Button>
        <NewTemplateDialog open={newTplOpen} onClose={() => setNewTplOpen(false)} onCreate={(tpl) => { onChange([...templates, tpl]); setActiveId(tpl.id); }} />
      </div>
    );
  }

  const html = generateHtmlFromBlocks(active.blocks, active.kind);

  const addBlock = (type: BlockType) => {
    const block = makeBlock(type);
    updateBlocks([...active.blocks, block as AnyBlock]);
    setSelectedBlockId(block.id);
    setTimeout(() => {
      blockListRef.current?.scrollTo({ top: blockListRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const next = [...active.blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  };

  const deleteBlock = (id: string) => {
    updateBlocks(active.blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const changeBlockConfig = (id: string, cfg: AnyBlock["config"]) => {
    updateBlocks(active.blocks.map((b) => (b.id === id ? ({ ...b, config: cfg } as AnyBlock) : b)));
  };

  const deleteTemplate = () => {
    const next = templates.filter((t) => t.id !== active.id);
    onChange(next);
    setActiveId(next[0]?.id ?? "");
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">

      {/* ---- top bar: selector + actions ---- */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <Select value={activeId} onValueChange={(v: string | null) => { if (v) { setActiveId(v); setSelectedBlockId(null); } }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  <span className="font-medium">{tpl.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{KIND_LABELS[tpl.kind]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => setNewTplOpen(true)}>
          Nueva
        </Button>

        {active.kind === "custom" && templates.length > 1 && (
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 text-destructive hover:text-destructive" onClick={deleteTemplate}>
            Eliminar
          </Button>
        )}
      </div>

      {/* ---- name + kind row ---- */}
      <div className="flex items-center gap-2 shrink-0">
        <Input
          value={active.name}
          onChange={(e) => updateTemplate({ name: e.target.value })}
          className="h-8 flex-1 text-sm font-medium"
          placeholder="Nombre de la plantilla"
        />
        <div className="flex items-center gap-1 rounded-lg border bg-muted/20 px-1 py-1 shrink-0">
          {(["orden", "cotizacion", "venta", "etiqueta", "ticket", "custom"] as TemplateKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                const defaultBlocksMap: Record<TemplateKind, () => AnyBlock[]> = {
                  orden: defaultOrderBlocks, cotizacion: defaultCotizacionBlocks,
                  venta: defaultSaleBlocks,
                  etiqueta: defaultLabelBlocks, ticket: defaultTicketBlocks, custom: () => active.blocks,
                };
                updateTemplate({ kind: k, blocks: active.blocks.length === 0 ? defaultBlocksMap[k]() : active.blocks });
              }}
              className={cn(
                "rounded-md px-2.5 py-0.5 text-xs transition-colors",
                active.kind === k ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* ---- body: builder + preview ---- */}
      <div className="grid flex-1 min-h-0 grid-cols-[380px_minmax(0,1fr)] gap-3">

        {/* ---- left: block builder ---- */}
        <div className="flex flex-col min-h-0 rounded-2xl border bg-background overflow-hidden">
          {/* block list */}
          <div ref={blockListRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {active.blocks.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground">
                <span>Sin bloques</span>
                <span className="text-xs">Usa el botón de abajo para agregar</span>
              </div>
            ) : (
              active.blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={active.blocks.length}
                  selected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  onDelete={() => deleteBlock(block.id)}
                  onChange={(cfg) => changeBlockConfig(block.id, cfg)}
                />
              ))
            )}
          </div>

          {/* add block button */}
          <div className="shrink-0 border-t p-3">
            <button
              type="button"
              onClick={() => setAddBlockOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span className="text-base leading-none">+</span>
              Agregar bloque
            </button>
          </div>
        </div>

        {/* ---- right: live preview ---- */}
        <div className="flex flex-col min-h-0 gap-2">
          <div className="flex items-center justify-between shrink-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vista previa</p>
            {active.kind === "ticket" && (
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">80mm térmico</span>
            )}
            {active.kind === "etiqueta" && (
              <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium">62×29mm</span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <HtmlPreview html={html} kind={active.kind} />
          </div>
        </div>
      </div>

      {/* ---- modals ---- */}
      <AddBlockModal
        open={addBlockOpen}
        onClose={() => setAddBlockOpen(false)}
        kind={active.kind}
        onAdd={addBlock}
      />
      <NewTemplateDialog
        open={newTplOpen}
        onClose={() => setNewTplOpen(false)}
        onCreate={(tpl) => {
          onChange([...templates, tpl]);
          setActiveId(tpl.id);
        }}
      />
    </div>
  );
}
