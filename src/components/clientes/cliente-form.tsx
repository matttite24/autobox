"use client";

import { useState, useId } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toastManager } from "@/components/ui/toast";
import { useOrg } from "@/components/providers/org-provider";

type ClientRole = "Cliente" | "Proveedor" | "Trabajador";

export type ClientDoc = {
  _id: Id<"clients">;
  type?: ClientRole;
  roles?: ClientRole[];
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

function effectiveRoles(client?: ClientDoc): ClientRole[] {
  if (!client) return ["Cliente"];
  if (client.roles && client.roles.length > 0) return client.roles;
  return [client.type ?? "Cliente"];
}

const ALL_ROLES: ClientRole[] = ["Cliente", "Proveedor", "Trabajador"];

export function ClienteForm({ client, trigger, fixedType, open: openProp, onOpenChange }: { client?: ClientDoc, trigger?: React.ReactElement, fixedType?: ClientRole, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { orgId } = useOrg();
  const isEditing = !!client;
  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const removeClient = useMutation(api.clients.remove);
  const formId = useId();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = (v: boolean) => { setOpenInternal(v); onOpenChange?.(v); };

  const initialRoles = fixedType ? [fixedType] : effectiveRoles(client);

  const [formData, setFormData] = useState({
    roles: initialRoles as ClientRole[],
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

  const isTrabajador = formData.roles.includes("Trabajador");

  const normalizeForm = () => ({
    roles: formData.roles,
    name: formData.name.trim(),
    documentId: formData.documentId.trim(),
    email: formData.email.trim(),
    phone: formData.phone.trim(),
    company: formData.company.trim(),
    baseSalary: Number(formData.baseSalary || "0"),
    employmentStatus: formData.employmentStatus as "Activo" | "Inactivo",
    hireDate: formData.hireDate ? new Date(formData.hireDate).getTime() : undefined,
    jobTitle: formData.jobTitle.trim(),
    employmentNotes: formData.employmentNotes.trim(),
  });

  const handleDelete = async () => {
    if (!client) return;
    try {
      await removeClient({ id: client._id });
      toastManager.add({ type: "success", title: "Persona eliminada", description: "El registro ha sido eliminado correctamente." });
      setOpen(false);
    } catch (err: any) {
      console.error("Error deleting persona:", err);
      toastManager.add({
        type: "error",
        title: "Error al eliminar",
        description: err?.message || "Hubo un problema al eliminar la persona.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.roles.length === 0) {
      toastManager.add({ type: "error", title: "Error", description: "Debe seleccionar al menos un rol." });
      return;
    }
    try {
      if (isEditing) {
        await updateClient({ id: client._id, ...normalizeForm() });
        toastManager.add({ type: "success", title: "Persona actualizada", description: "Los datos han sido guardados." });
      } else {
        if (!orgId) throw new Error("No organization selected");
        await createClient({ ...normalizeForm(), orgId });
        toastManager.add({ type: "success", title: "Persona creada", description: "El registro ha sido guardado correctamente." });
        setFormData({
          roles: fixedType ? [fixedType] : ["Cliente"],
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
    } catch (err: any) {
      console.error("Error saving persona:", err);
      toastManager.add({
        type: "error",
        title: "Error",
        description: err?.message || `Hubo un problema al ${isEditing ? "actualizar" : "crear"} la persona.`,
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
          <form id={formId} onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            {!fixedType && (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_ROLES.map((role) => {
                    const checked = formData.roles.includes(role);
                    const id = `${formId}-role-${role}`;
                    return (
                      <label
                        key={role}
                        htmlFor={id}
                        className={`flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-input hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(val) => {
                            if (!val && formData.roles.length === 1) return;
                            setFormData((prev) => ({
                              ...prev,
                              roles: val
                                ? [...prev.roles, role]
                                : prev.roles.filter((r) => r !== role),
                            }));
                          }}
                        />
                        <span className={`text-sm font-medium leading-none ${checked ? "text-primary" : "text-foreground"}`}>
                          {role}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={`${formId}-name`}>Nombre</Label>
              <Input
                id={`${formId}-name`}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-documentId`}>RUC / CI</Label>
              <Input
                id={`${formId}-documentId`}
                value={formData.documentId}
                onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                placeholder="Número de identificación"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-email`}>Correo</Label>
              <Input
                id={`${formId}-email`}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-phone`}>Teléfono</Label>
              <Input
                id={`${formId}-phone`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-company`}>Empresa</Label>
              <Input
                id={`${formId}-company`}
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            {isTrabajador && (
              <div className="grid gap-4 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-baseSalary`}>Sueldo base</Label>
                    <Input
                      id={`${formId}-baseSalary`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-employmentStatus`}>Estado laboral</Label>
                    <select
                      id={`${formId}-employmentStatus`}
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
                    <Label htmlFor={`${formId}-hireDate`}>Fecha de ingreso</Label>
                    <Input
                      id={`${formId}-hireDate`}
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-jobTitle`}>Cargo</Label>
                    <Input
                      id={`${formId}-jobTitle`}
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-employmentNotes`}>Notas laborales</Label>
                  <Textarea
                    id={`${formId}-employmentNotes`}
                    value={formData.employmentNotes}
                    onChange={(e) => setFormData({ ...formData, employmentNotes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <DrawerFooter className="sticky bottom-0 z-10 shrink-0 flex-row justify-between gap-2 px-4 py-4 border-t mt-4">
          {isEditing ? (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" type="button">Eliminar</Button>} />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Sólo se puede eliminar si no tiene transacciones o registros asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="outline">Cancelar</Button>} />
                  <AlertDialogClose
                    render={
                      <Button variant="destructive" onClick={handleDelete}>
                        Sí, eliminar
                      </Button>
                    }
                  />
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <DrawerClose render={<Button variant="ghost">Cancelar</Button>} />
            <Button
              type="submit"
              form={formId}
            >
              {isEditing ? "Guardar Cambios" : "Guardar Persona"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  );
}
