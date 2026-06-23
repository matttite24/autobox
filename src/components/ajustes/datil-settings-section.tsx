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
  currentSettings: DatilConfig;
  onSave: (config: DatilConfig) => Promise<void>;
};

export function DatilSettingsSection({ visible, formId, currentSettings, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [apiKey, setApiKey] = useState(currentSettings.datilApiKey ?? "");
  const [certPassword, setCertPassword] = useState(currentSettings.datilCertPassword ?? "");
  const [ambiente, setAmbiente] = useState<1 | 2>(currentSettings.datilAmbiente ?? 1);
  const [establecimiento, setEstablecimiento] = useState(currentSettings.datilEstablecimiento ?? "001");
  const [puntoEmision, setPuntoEmision] = useState(currentSettings.datilPuntoEmision ?? "001");
  const [obligado, setObligado] = useState<"SI" | "NO">(currentSettings.datilObligadoContabilidad ?? "NO");

  const isConfigured = !!(currentSettings.datilApiKey && currentSettings.datilCertPassword);

  if (!visible) return null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Facturación Electrónica — Datil</h2>
          <p className="text-sm text-muted-foreground">
            Configura las credenciales de Datil para emitir facturas electrónicas desde esta organización.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
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
        id={formId}
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave({
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
            setSaving(false);
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

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </form>
    </section>
  );
}
