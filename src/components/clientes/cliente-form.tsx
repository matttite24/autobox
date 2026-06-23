"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toastManager } from "@/components/ui/toast";
import { useOrg } from "@/components/providers/org-provider";

export type ClientDoc = {
  _id: Id<"clients">;
  type?: "Cliente" | "Proveedor" | "Trabajador";
  name: string;
  documentId?: string;
  email: string;
  phone?: string;
  company?: string;
  baseSalary?: number;
  employmentStatus?: "Activo" | "Inactivo";
  hireDate?: number;
  jobTitle?: string;
  employmentNotes?: string;
};

export function ClienteForm({ client, trigger, fixedType, open: openProp, onOpenChange }: { client?: ClientDoc, trigger?: React.ReactElement, fixedType?: "Cliente" | "Proveedor" | "Trabajador", open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { orgId } = useOrg();
  const isEditing = !!client;
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };
  const [formData, setFormData] = useState({
    type: client?.type || fixedType || "Cliente",
    name: client?.name || "",
    documentId: client?.documentId || "",
    email: client?.email || "",
    phone: client?.phone || "",
    company: client?.company || "",
    baseSalary: client?.baseSalary?.toString() || "0",
    employmentStatus: client?.employmentStatus || "Activo",
    hireDate: client?.hireDate ? new Date(client.hireDate).toISOString().slice(0, 10) : "",
    jobTitle: client?.jobTitle || "",
    employmentNotes: client?.employmentNotes || "",
  });

  const normalizeForm = () => ({
    type: formData.type,
    name: formData.name.trim(),
    documentId: formData.documentId.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    company: formData.company.trim(),
    baseSalary: Number(formData.baseSalary || "0"),
    employmentStatus: formData.employmentStatus,
    hireDate: formData.hireDate ? new Date(formData.hireDate).getTime() : undefined,
    jobTitle: formData.jobTitle.trim(),
    employmentNotes: formData.employmentNotes.trim(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateClient({ id: client._id, ...normalizeForm(), type: formData.type });
        toastManager.add({ type: "success", title: "Persona actualizada", description: "Los datos han sido guardados." });
      } else {
        if (!orgId) throw new Error("No organization selected");
        await createClient({ ...normalizeForm(), orgId, type: fixedType || formData.type });
        toastManager.add({ type: "success", title: "Persona creada", description: "El registro ha sido guardado correctamente." });
        setFormData({
          type: fixedType || "Cliente",
          name: "",
          documentId: "",
          email: "",
          phone: "",
          company: "",
          baseSalary: "0",
          employmentStatus: "Activo",
          hireDate: "",
          jobTitle: "",
          employmentNotes: "",
        });
      }
      setOpen(false);
    } catch {
      toastManager.add({
        type: "error",
        title: "Error",
        description: `Hubo un problema al ${isEditing ? "actualizar" : "crear"} la persona.`,
      });
    }
  };

  return (
    <Drawer position="right" open={open} onOpenChange={setOpen}>
      {openProp === undefined && (
        <DrawerTrigger
          render={
            trigger ?? (
              <Button>
                Registrar Persona
              </Button>
            )
          }
        />
      )}
      <DrawerPopup
        variant="inset"
        className="max-w-md w-full h-full flex flex-col bg-background rounded-l-2xl border-l"
      >
        <DrawerHeader className="shrink-0 pt-6 pb-2 px-4 text-left">
          <DrawerTitle>{isEditing ? "Editar Persona" : "Nueva Persona"}</DrawerTitle>
          <DrawerDescription>
            {isEditing 
              ? "Modifica los datos del registro." 
              : "Ingresa los detalles de la persona. Haz clic en guardar cuando termines."}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form id="cliente-form" onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            {!fixedType && (
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "Cliente" | "Proveedor" | "Trabajador" })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Cliente">Cliente</option>
                  <option value="Proveedor">Proveedor</option>
                  <option value="Trabajador">Trabajador</option>
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input 
                id="name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentId">RUC / CI</Label>
              <Input 
                id="documentId" 
                value={formData.documentId} 
                onChange={e => setFormData({ ...formData, documentId: e.target.value })} 
                placeholder="Número de identificación"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input 
                id="phone" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input 
                id="company" 
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            {formData.type === "Trabajador" && (
              <div className="grid gap-4 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Sueldo base</Label>
                    <Input
                      id="baseSalary"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentStatus">Estado laboral</Label>
                    <select
                      id="employmentStatus"
                      value={formData.employmentStatus}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as "Activo" | "Inactivo" })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Fecha de ingreso</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Cargo</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employmentNotes">Notas laborales</Label>
                  <Textarea
                    id="employmentNotes"
                    value={formData.employmentNotes}
                    onChange={(e) => setFormData({ ...formData, employmentNotes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-2 px-4 py-4 border-t mt-4">
          <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
          <Button
            type="submit"
            form="cliente-form"
          >
            {isEditing ? "Guardar Cambios" : "Guardar Persona"}
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
