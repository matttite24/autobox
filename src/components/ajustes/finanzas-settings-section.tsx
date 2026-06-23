"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { BankSummary, PaymentNetworkSummary } from "./types";

type Props = {
  visible: boolean;
  title: string;
  description: string;
  enabledPaymentMethods: Array<"Efectivo" | "Tarjeta" | "Transferencia">;
  banks: BankSummary[];
  paymentNetworks: PaymentNetworkSummary[];
  onCreateBank: (next: { name: string; bankName?: string; accountNumber?: string; initialBalance?: number }) => Promise<void>;
  onCreatePaymentNetwork: (next: { name: string; alias?: string; commissionRate: number }) => Promise<void>;
  onSavePaymentMethods: (methods: Array<"Efectivo" | "Tarjeta" | "Transferencia">) => Promise<void>;
};

export function FinanzasSettingsSection({ visible, title, description, enabledPaymentMethods, banks, paymentNetworks, onCreateBank, onCreatePaymentNetwork, onSavePaymentMethods }: Props) {
  const [savingMethods, setSavingMethods] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBankName, setEditingBankName] = useState("");
  const [editingAccountNumber, setEditingAccountNumber] = useState("");
  const [savingEditedBank, setSavingEditedBank] = useState(false);
  const updateBank = useMutation(api.banks.update);
  const [methods, setMethods] = useState({
    efectivo: enabledPaymentMethods.includes("Efectivo"),
    tarjeta: enabledPaymentMethods.includes("Tarjeta"),
    transferencia: enabledPaymentMethods.includes("Transferencia"),
  });
  const [bankName, setBankName] = useState("");
  const [bankInstitution, setBankInstitution] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankInitialBalance, setBankInitialBalance] = useState("");
  const [networkName, setNetworkName] = useState("");
  const [networkAlias, setNetworkAlias] = useState("");
  const [networkCommissionRate, setNetworkCommissionRate] = useState("");
  const [savingNetwork, setSavingNetwork] = useState(false);

  const startEditBank = (bank: BankSummary) => {
    setEditingBankId(bank._id);
    setEditingBankName(bank.name);
    setEditingAccountNumber(bank.accountNumber ?? "");
  };

  const saveEditedBank = async () => {
    if (!editingBankId || !editingBankName.trim()) return;
    setSavingEditedBank(true);
    try {
      await updateBank({
        id: editingBankId as never,
        name: editingBankName.trim(),
        accountNumber: editingAccountNumber.trim() || undefined,
      });
      setEditingBankId(null);
      setEditingBankName("");
      setEditingAccountNumber("");
    } finally {
      setSavingEditedBank(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!networkName.trim()) return;
              setSavingNetwork(true);
              try {
                await onCreatePaymentNetwork({
                  name: networkName.trim(),
                  alias: networkAlias.trim() || undefined,
                  commissionRate: Number(networkCommissionRate || "0"),
                });
                setNetworkName("");
                setNetworkAlias("");
                setNetworkCommissionRate("");
              } finally {
                setSavingNetwork(false);
              }
            }}
          >
            <h3 className="text-sm font-semibold">Redes de cobro</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="networkName">Nombre</Label>
                <Input id="networkName" value={networkName} onChange={(e) => setNetworkName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkAlias">Alias</Label>
                <Input id="networkAlias" value={networkAlias} onChange={(e) => setNetworkAlias(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="networkCommissionRate">Comisión %</Label>
                <Input id="networkCommissionRate" type="number" step="0.01" min="0" value={networkCommissionRate} onChange={(e) => setNetworkCommissionRate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingNetwork}>{savingNetwork ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>

          <div className="mt-4 grid gap-3">
            {paymentNetworks.length > 0 ? (
              paymentNetworks.map((network) => (
                <div key={network._id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{network.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {network.alias || "Sin alias"} · Comisión {network.commissionRate.toFixed(2)}%
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {network.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Saldo pendiente {network.currentBalance.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay redes de cobro creadas aún.</p>
            )}
          </div>
      </div>



      <div className="rounded-xl border bg-muted/20 p-4">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!bankName.trim()) return;
              setSavingBank(true);
              try {
                await onCreateBank({
                  name: bankName.trim(),
                  bankName: bankInstitution.trim() || undefined,
                  accountNumber: bankAccountNumber.trim() || undefined,
                  initialBalance: bankInitialBalance.trim() ? Number(bankInitialBalance) : undefined,
                });
                setBankName("");
                setBankInstitution("");
                setBankAccountNumber("");
                setBankInitialBalance("");
              } finally {
                setSavingBank(false);
              }
            }}
          >
            <h3 className="text-sm font-semibold">Cuentas bancarias</h3>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nombre</Label>
                <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankInstitution">Banco</Label>
                <Input id="bankInstitution" value={bankInstitution} onChange={(e) => setBankInstitution(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Número de cuenta</Label>
                <Input id="bankAccount" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankInitialBalance">Saldo inicial opcional</Label>
                <Input id="bankInitialBalance" type="number" step="0.01" value={bankInitialBalance} onChange={(e) => setBankInitialBalance(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingBank}>{savingBank ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>

          <div className="mt-4 grid gap-3">
            {banks.length > 0 ? (
              banks.map((bankItem) => (
                <div key={bankItem._id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{bankItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {bankItem.bankName || "Sin banco"} · {bankItem.accountNumber || "Sin cuenta"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEditBank(bankItem)}>
                        Editar
                      </Button>
                    </div>
                  </div>

                  {editingBankId === bankItem._id ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={editingBankName} onChange={(e) => setEditingBankName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Número de cuenta</Label>
                        <Input value={editingAccountNumber} onChange={(e) => setEditingAccountNumber(e.target.value)} />
                      </div>
                      <div className="flex gap-2 md:col-span-2 md:justify-end">
                        <Button type="button" variant="ghost" onClick={() => setEditingBankId(null)}>
                          Cancelar
                        </Button>
                        <Button type="button" onClick={saveEditedBank} disabled={savingEditedBank}>
                          {savingEditedBank ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay bancos creados aún.</p>
            )}
          </div>
      </div>
    </section>
  );
}
