"use client";

import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { AppHeader } from "@/components/app-header";
import { GeneralSettingsSection } from "@/components/ajustes/general-settings-section";
import { FiscalSettingsSection } from "@/components/ajustes/fiscal-settings-section";
import { InventarioSettingsSection } from "@/components/ajustes/inventario-settings-section";
import { FinanzasSettingsSection } from "@/components/ajustes/finanzas-settings-section";
import { PerfilSettingsSection } from "@/components/ajustes/perfil-settings-section";
import { Button } from "@/components/ui/button";
import { FloppyDiskIcon } from "hugeicons-react";

export default function AjustesPage() {
  const { orgId } = useOrg();
  const searchParams = useSearchParams();
  const org = useQuery(api.organizations.current, {});
  const settings = useQuery(api.organizations.settings, orgId ? { orgId } : "skip");
  const banks = useQuery(api.banks.get, orgId ? { orgId } : "skip");
  const paymentNetworks = useQuery(api.payment_networks.get, orgId ? { orgId } : "skip");
  const saveOrg = useMutation(api.organizations.updateCurrent);
  const saveSettings = useMutation(api.organizations.upsertSettings);
  const saveDatilConfig = useMutation(api.organizations.upsertDatilConfig);
  const createBank = useMutation(api.banks.create);
  const createPaymentNetwork = useMutation(api.payment_networks.create);

  const section = searchParams.get("section") ?? "general";
  const activeFormId =
    section === "general"
      ? "ajustes-general-form"
      : section === "facturacion"
        ? "ajustes-facturacion-form"
        : section === "inventario"
          ? "ajustes-inventario-form"
          : null;

  const bank = settings ?? {
    commercialName: org?.name || "Taller Principal",
    fiscalName: "",
    taxRate: 15,
    zeroTaxRate: 0,
    roundingMode: "nearest" as const,
    currency: "USD",
    enabledPaymentMethods: ["Efectivo", "Tarjeta", "Transferencia"] as const,
    profitPlans: [
      { id: "base-1", name: "Base", percentage: 20, rounding: "nearest" as const },
      { id: "premium-1", name: "Premium", percentage: 35, rounding: "nearest" as const },
      { id: "pro-1", name: "Pro", percentage: 50, rounding: "nearest" as const },
    ],
    defaultProfitPlanId: "base-1",
    templates: [],
  };
  const fiscalName = bank.fiscalName ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Ajustes" mobileTitle="Ajustes">
        {activeFormId ? (
          <Button type="submit" form={activeFormId} size="sm" className="shrink-0 gap-2">
            <FloppyDiskIcon className="size-4" />
            <span className="hidden sm:inline">Guardar</span>
          </Button>
        ) : null}
      </AppHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6">
        <GeneralSettingsSection
          visible={section === "general"}
          formId="ajustes-general-form"
          title="General"
          description="Datos base de la organización y nombres visibles en la app."
          orgName={org?.name || "Taller Principal"}
          commercialName={bank.commercialName}
          fiscalName={fiscalName}
          ruc={settings?.ruc}
          address={settings?.address}
          contact={settings?.contact}
          website={settings?.website}
          legalRepresentative={settings?.legalRepresentative}
          onSave={async (name, data) => {
            if (!org || !orgId) return;
            await saveOrg({ name });
            await saveSettings({
              orgId,
              commercialName: data.commercialName,
              fiscalName: data.fiscalName,
              ruc: data.ruc,
              address: data.address,
              contact: data.contact,
              website: data.website,
              legalRepresentative: data.legalRepresentative,
              taxRate: bank.taxRate,
              zeroTaxRate: bank.zeroTaxRate,
              roundingMode: bank.roundingMode,
              currency: bank.currency,
              enabledPaymentMethods: bank.enabledPaymentMethods,
              profitPlans: bank.profitPlans,
              defaultProfitPlanId: bank.defaultProfitPlanId,
            });
          }}
        />
        <FiscalSettingsSection
          visible={section === "facturacion"}
          formId="ajustes-facturacion-form"
          title="Facturación"
          description="Configura IVA, redondeo y moneda para toda la organización."
          commercialName={bank.commercialName}
          fiscalName={fiscalName}
          taxRate={bank.taxRate}
          zeroTaxRate={bank.zeroTaxRate}
          currency={bank.currency}
          roundingMode={bank.roundingMode}
          datilConfig={{
            datilApiKey: settings?.datilApiKey,
            datilCertPassword: settings?.datilCertPassword,
            datilAmbiente: settings?.datilAmbiente,
            datilEstablecimiento: settings?.datilEstablecimiento,
            datilPuntoEmision: settings?.datilPuntoEmision,
            datilObligadoContabilidad: settings?.datilObligadoContabilidad,
          }}
          onSave={async (next) => {
            if (!orgId) return;
            await saveSettings({
              orgId,
              commercialName: next.commercialName,
              fiscalName: next.fiscalName,
              ruc: settings?.ruc,
              address: settings?.address,
              contact: settings?.contact,
              website: settings?.website,
              legalRepresentative: settings?.legalRepresentative,
              taxRate: next.taxRate,
              zeroTaxRate: next.zeroTaxRate,
              roundingMode: next.roundingMode,
              currency: next.currency,
              enabledPaymentMethods: bank.enabledPaymentMethods,
              profitPlans: bank.profitPlans,
              defaultProfitPlanId: bank.defaultProfitPlanId,
            });
          }}
          onSaveDatil={async (config) => {
            if (!orgId) return;
            await saveDatilConfig({ orgId, ...config });
          }}
        />
        <InventarioSettingsSection
          visible={section === "inventario"}
          formId="ajustes-inventario-form"
          title="Inventario"
          description="Define los planes de rentabilidad que luego se aplican a los productos."
          profitPlans={bank.profitPlans}
          defaultProfitPlanId={bank.defaultProfitPlanId}
          onSave={async (next) => {
            if (!orgId) return;
            await saveSettings({
              orgId,
              commercialName: bank.commercialName,
              fiscalName,
              ruc: settings?.ruc,
              address: settings?.address,
              contact: settings?.contact,
              website: settings?.website,
              legalRepresentative: settings?.legalRepresentative,
              taxRate: bank.taxRate,
              zeroTaxRate: bank.zeroTaxRate,
              roundingMode: bank.roundingMode,
              currency: bank.currency,
              enabledPaymentMethods: bank.enabledPaymentMethods,
              ...next,
            });
          }}
        />
        <FinanzasSettingsSection
          visible={section === "finanzas"}
          title="Finanzas"
          description="Activa medios de pago y registra las cuentas bancarias de la organización."
          enabledPaymentMethods={bank.enabledPaymentMethods}
          banks={banks ?? []}
          paymentNetworks={paymentNetworks ?? []}
          onSavePaymentMethods={async (methods) => {
            if (!orgId) return;
            await saveSettings({
              orgId,
              commercialName: bank.commercialName,
              fiscalName,
              ruc: settings?.ruc,
              address: settings?.address,
              contact: settings?.contact,
              website: settings?.website,
              legalRepresentative: settings?.legalRepresentative,
              taxRate: bank.taxRate,
              zeroTaxRate: bank.zeroTaxRate,
              roundingMode: bank.roundingMode,
              currency: bank.currency,
              enabledPaymentMethods: methods,
              profitPlans: bank.profitPlans,
              defaultProfitPlanId: bank.defaultProfitPlanId,
            });
          }}
          onCreateBank={async (next) => {
            if (!orgId) return;
            await createBank({ orgId, ...next });
          }}
          onCreatePaymentNetwork={async (next) => {
            if (!orgId) return;
            await createPaymentNetwork({ orgId, ...next });
          }}
        />
        <PerfilSettingsSection visible={section === "perfil"} />
      </div>
    </div>
  );
}
