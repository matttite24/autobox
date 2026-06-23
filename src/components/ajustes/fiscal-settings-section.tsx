"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { ViewIcon, ViewOffSlashIcon, CheckmarkCircle01Icon, Alert01Icon } from "hugeicons-react";

type DatilConfig = {
  datilApiKey?: string;
  datilCertPassword?: string;
  datilAmbiente?: 1 | 2;
  datilEstablecimiento?: string;
  datilPuntoEmision?: string;
  datilObligadoContabilidad?: "SI" | "NO";
};

type Props = {
  visible: boolean;
  formId?: string;
  title: string;
  description: string;
  commercialName: string;
  fiscalName: string;
  taxRate: number;
  zeroTaxRate: number;
  currency: string;
  roundingMode: "none" | "nearest" | "up" | "down";
  datilConfig: DatilConfig;
  onSave: (next: {
    commercialName: string;
    fiscalName?: string;
    taxRate: number;
    zeroTaxRate: number;
    roundingMode: "none" | "nearest" | "up" | "down";
    currency: string;
  }) => Promise<void>;
  onSaveDatil: (config: DatilConfig) => Promise<void>;
};

export function FiscalSettingsSection({
  visible, formId, title, description,
  commercialName, fiscalName, taxRate, zeroTaxRate, currency, roundingMode,
  datilConfig, onSave, onSaveDatil,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [savingDatil, setSavingDatil] = useState(false);
  const [tax, setTax] = useState(String(taxRate));
  const [zeroTax, setZeroTax] = useState(String(zeroTaxRate));
  const [rounding, setRounding] = useState(roundingMode);
  const [curr, setCurr] = useState(currency);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setApiKey] = useState(datilConfig.datilApiKey ?? "");
  const [certPassword, setCertPassword] = useState(datilConfig.datilCertPassword ?? "");
  const [ambiente, setAmbiente] = useState<1 | 2>(datilConfig.datilAmbiente ?? 1);
  const [establecimiento, setEstablecimiento] = useState(datilConfig.datilEstablecimiento ?? "001");
  const [puntoEmision, setPuntoEmision] = useState(datilConfig.datilPuntoEmision ?? "001");
  const [obligado, setObligado] = useState<"SI" | "NO">(datilConfig.datilObligadoContabilidad ?? "NO");

  const isConfigured = !!(datilConfig.datilApiKey && datilConfig.datilCertPassword);

  if (!visible) return null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      {/* IVA y moneda */}
      <div className="space-y-4">
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
              await onSave({
                commercialName,
                fiscalName: fiscalName || undefined,
                taxRate: Number(tax || "0"),
                zeroTaxRate: Number(zeroTax || "0"),
                roundingMode: rounding,
                currency: curr,
              });
              toastManager.add({ type: "success", title: "Guardado", description: "Los ajustes fiscales se actualizaron." });
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select id="currency" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={curr} onChange={(e) => setCurr(e.target.value)}>
                {["USD", "EUR", "MXN", "COP", "ARS", "PEN"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundingMode">Redondeo</Label>
              <select id="roundingMode" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" value={rounding} onChange={(e) => setRounding(e.target.value as typeof rounding)}>
                <option value="none">Sin redondeo</option>
                <option value="nearest">Al más cercano</option>
                <option value="up">Hacia arriba</option>
                <option value="down">Hacia abajo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">IVA general (%)</Label>
              <Input id="taxRate" type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zeroTaxRate">IVA 0 (%)</Label>
              <Input id="zeroTaxRate" type="number" min="0" step="0.01" value={zeroTax} onChange={(e) => setZeroTax(e.target.value)} />
            </div>
          </div>
        </form>
      </div>

      <div className="border-t" />

      {/* Datil */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold">Facturación Electrónica — Datil</h3>
            <p className="text-sm text-muted-foreground">
              Credenciales de Datil para emitir facturas electrónicas desde esta organización.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isConfigured ? (
              <>
                <CheckmarkCircle01Icon className="size-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Configurado</span>
              </>
            ) : (
              <>
                <Alert01Icon className="size-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">Sin configurar</span>
              </>
            )}
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingDatil(true);
            try {
              await onSaveDatil({
                datilApiKey: apiKey || undefined,
                datilCertPassword: certPassword || undefined,
                datilAmbiente: ambiente,
                datilEstablecimiento: establecimiento || undefined,
                datilPuntoEmision: puntoEmision || undefined,
                datilObligadoContabilidad: obligado,
              });
              toastManager.add({ type: "success", title: "Guardado", description: "Configuración de Datil actualizada." });
            } catch (error) {
              toastManager.add({ type: "error", title: "Error", description: error instanceof Error ? error.message : "No se pudo guardar." });
            } finally {
              setSavingDatil(false);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datilApiKey">API Key (X-Key)</Label>
              <div className="relative">
                <Input
                  id="datilApiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Tu API Key de Datil"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey((v) => !v)}
                  tabIndex={-1}
                >
                  {showApiKey ? <ViewOffSlashIcon className="size-4" /> : <ViewIcon className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datilCertPassword">Contraseña Certificado (X-Password)</Label>
              <div className="relative">
                <Input
                  id="datilCertPassword"
                  type={showPassword ? "text" : "password"}
                  value={certPassword}
                  onChange={(e) => setCertPassword(e.target.value)}
                  placeholder="Contraseña del certificado"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <ViewOffSlashIcon className="size-4" /> : <ViewIcon className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datilAmbiente">Ambiente</Label>
              <select
                id="datilAmbiente"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                value={ambiente}
                onChange={(e) => setAmbiente(Number(e.target.value) as 1 | 2)}
              >
                <option value={1}>Sandbox (pruebas)</option>
                <option value={2}>Producción</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datilObligado">Obligado a llevar contabilidad</Label>
              <select
                id="datilObligado"
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                value={obligado}
                onChange={(e) => setObligado(e.target.value as "SI" | "NO")}
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datilEstablecimiento">Código Establecimiento</Label>
              <Input
                id="datilEstablecimiento"
                value={establecimiento}
                onChange={(e) => setEstablecimiento(e.target.value)}
                placeholder="001"
                maxLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datilPuntoEmision">Punto de Emisión</Label>
              <Input
                id="datilPuntoEmision"
                value={puntoEmision}
                onChange={(e) => setPuntoEmision(e.target.value)}
                placeholder="001"
                maxLength={3}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <a
              href="https://app.datil.com/login?next=/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Ir al portal de Datil →
            </a>
            <Button type="submit" size="sm" disabled={savingDatil}>
              {savingDatil ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
