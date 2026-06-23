"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { Delete02Icon, Calendar01Icon, Tag01Icon } from "hugeicons-react";
import { useOrg } from "@/components/providers/org-provider";

type OrderPayment = {
  id: string;
  amount: number;
  method: "Efectivo" | "Tarjeta" | "Transferencia";
  bankId?: Id<"banks">;
  networkId?: Id<"payment_networks">;
  date: number;
  reference?: string;
};

interface OrderPaymentsDrawerProps {
  entityId: Id<"work_orders"> | Id<"sales">;
  entityType?: "order" | "sale";
  payments?: OrderPayment[];
  saldo: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderPaymentsDrawer({ entityId, entityType = "order", payments, saldo, open, onOpenChange }: OrderPaymentsDrawerProps) {
  const { orgId } = useOrg();
  const updateOrderPayments = useMutation(api.work_orders.updatePayments);
  const updateSalePayments = useMutation(api.sales.updatePayments);
  const banks = useQuery(api.banks.get, orgId ? { orgId } : "skip");
  const paymentNetworks = useQuery(api.payment_networks.get, orgId ? { orgId } : "skip");
  const openCashSession = useQuery(api.finances.getOpenCashSession, orgId ? { orgId } : "skip");
  const isSale = entityType === "sale";
  const [paymentList, setPaymentList] = useState<OrderPayment[]>(() => payments ?? []);

  const [newPayment, setNewPayment] = useState({
    amount: (saldo > 0 ? saldo : 0) as number | string,
    method: "Efectivo",
    bankId: "",
    networkId: "",
    reference: ""
  });

  // Reset internal state when opened
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setPaymentList(payments ?? []);
      setNewPayment({
        amount: (saldo > 0 ? saldo : 0) as number | string,
        method: "Efectivo",
        bankId: "",
        networkId: "",
          reference: ""
        });
    }
    onOpenChange(val);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(newPayment.amount) || 0;
    if (amountNum <= 0) return;
    if (newPayment.method === "Tarjeta" && !newPayment.networkId) {
      toastManager.add({
        type: "error",
        title: "Red requerida",
        description: "Debes seleccionar una red de cobro para registrar tarjeta.",
      });
      return;
    }
    if (newPayment.method === "Transferencia" && !newPayment.bankId) {
      toastManager.add({
        type: "error",
        title: "Banco requerido",
        description: "Debes seleccionar un banco para registrar una transferencia.",
      });
      return;
    }
    
    const payment: OrderPayment = {
      id: crypto.randomUUID(),
      amount: amountNum,
      method: newPayment.method as "Efectivo" | "Tarjeta" | "Transferencia",
      bankId: newPayment.method === "Transferencia" ? (newPayment.bankId as Id<"banks">) || undefined : undefined,
      networkId: newPayment.method === "Tarjeta" ? (newPayment.networkId as Id<"payment_networks">) || undefined : undefined,
      date: Date.now(),
      reference: newPayment.reference?.trim() || undefined
    };
    
    const newPayments = [...paymentList, payment];

    try {
      if (isSale) {
        await updateSalePayments({
          id: entityId as Id<"sales">,
          payments: newPayments,
        });
      } else {
        await updateOrderPayments({
          id: entityId as Id<"work_orders">,
          payments: newPayments,
        });
      }
      setPaymentList(newPayments);
      toastManager.add({ type: "success", title: "Pago registrado", description: "El pago ha sido registrado." });
      setNewPayment({ amount: 0, method: "Efectivo", bankId: "", networkId: "", reference: "" });
      // Don't close drawer automatically so user can see the new payment in the list
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo registrar el pago." });
    }
  };

  const transferNeedsBank = newPayment.method === "Transferencia" && !newPayment.bankId;
  const cardNeedsNetwork = newPayment.method === "Tarjeta" && !newPayment.networkId;

  const handleRemovePayment = async (paymentId: string) => {
    try {
      const newPayments = paymentList.filter((p) => p.id !== paymentId);
      if (isSale) {
        await updateSalePayments({
          id: entityId as Id<"sales">,
          payments: newPayments
        });
      } else {
        await updateOrderPayments({
          id: entityId as Id<"work_orders">,
          payments: newPayments
        });
      }
      setPaymentList(newPayments);
      toastManager.add({ type: "success", title: "Pago eliminado", description: "El pago fue removido exitosamente." });
    } catch {
      toastManager.add({ type: "error", title: "Error", description: "No se pudo eliminar el pago." });
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={handleOpenChange}>
      <DrawerPopup variant="inset">
        <DrawerHeader>
          <DrawerTitle>Registrar Pago</DrawerTitle>
          <DrawerDescription>
            Agrega un nuevo pago para esta orden.
          </DrawerDescription>
        </DrawerHeader>
        
        <form onSubmit={handleAddPayment} className="flex flex-col flex-1 min-h-0">
          <DrawerPanel className="grid gap-6">
            <div className="bg-muted p-4 rounded-lg flex justify-between items-center -mb-2">
              <span className="font-medium text-muted-foreground">Saldo Pendiente</span>
              <span className={`text-xl font-bold ${saldo <= 0 ? 'text-emerald-500' : ''}`}>
                ${Math.max(0, saldo).toFixed(2)}
              </span>
            </div>
            
            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input 
                autoFocus
                type="number" 
                min="0.01"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({...newPayment, amount: e.target.value === "" ? "" : parseFloat(e.target.value)})}
              />
            </div>
            
            <div className="space-y-3">
              <Label>Método de Pago</Label>
              <div className="flex flex-wrap gap-2">
                {["Efectivo", "Tarjeta", "Transferencia"].map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={newPayment.method === method ? "default" : "outline"}
                    className="flex-1"
                    disabled={method === "Efectivo" && openCashSession !== undefined && !openCashSession}
                    onClick={() => setNewPayment({...newPayment, method})}
                  >
                    {method}
                  </Button>
                ))}
              </div>
              {openCashSession === null ? (
                <p className="text-xs text-muted-foreground">
                  La caja diaria debe estar abierta para registrar cobros en efectivo.
                </p>
              ) : null}
            </div>
            
            {newPayment.method !== "Efectivo" && (
              <div className="space-y-2">
                <Label>Referencia / Comprobante</Label>
                <Input 
                  placeholder={newPayment.method === "Transferencia" ? "N° de transacción o referencia" : "N° de transacción"}
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({...newPayment, reference: e.target.value})}
                />
              </div>
            )}

            {newPayment.method === "Tarjeta" && (
              <div className="space-y-2">
                <Label>Red de cobro</Label>
                <select
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  value={newPayment.networkId}
                  onChange={(e) => setNewPayment({ ...newPayment, networkId: e.target.value })}
                >
                  <option value="">Selecciona una red</option>
                  {paymentNetworks?.filter((network) => network.status === "Activo").map((network) => (
                    <option key={network._id} value={network._id}>
                      {network.name} · {network.commissionRate.toFixed(2)}%
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Obligatorio para pagos con tarjeta.</p>
              </div>
            )}

              {newPayment.method === "Transferencia" && (
                <div className="space-y-2">
                  <Label>Banco destino</Label>
                  <select
                    className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                    value={newPayment.bankId}
                    onChange={(e) => setNewPayment({ ...newPayment, bankId: e.target.value })}
                  >
                    <option value="">Selecciona un banco</option>
                    {banks?.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Obligatorio para transferencias.</p>
                </div>
            )}

            {/* Lista de pagos realizados */}
            {paymentList.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Historial de Pagos</h4>
                <div className="space-y-2">
                  {paymentList.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-2.5 bg-muted/30 border rounded-md">
                      <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">${payment.amount.toFixed(2)}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-muted rounded-sm text-muted-foreground">
                            {payment.method}
                            {payment.method === "Tarjeta" && payment.networkId ? ` · ${payment.networkId}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar01Icon className="h-3 w-3" /> {new Date(payment.date).toLocaleDateString()}</span>
                          {payment.reference && <span className="flex items-center gap-1 truncate max-w-[120px]" title={payment.reference}><Tag01Icon className="h-3 w-3" /> {payment.reference}</span>}
                          {payment.bankId && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Banco</span>}
                        </div>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon-sm" 
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleRemovePayment(payment.id)}
                      >
                        <Delete02Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DrawerPanel>
          
          <DrawerFooter>
            <DrawerClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DrawerClose>
            <Button type="submit" disabled={(Number(newPayment.amount) || 0) <= 0 || transferNeedsBank || cardNeedsNetwork}>
              Guardar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerPopup>
    </Drawer>
  );
}
