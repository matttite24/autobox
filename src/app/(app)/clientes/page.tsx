"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { ClienteForm, ClientDoc } from "@/components/clientes/cliente-form";
import { ClientDetailsSheet } from "@/components/clientes/client-details-sheet";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { useNewShortcut } from "@/hooks/use-new-shortcut";
import { usePagination } from "@/hooks/use-pagination";
import { PaginationBar } from "@/components/pagination-bar";
import { useDebounce } from "@/hooks/use-debounce";
import { PencilEdit01Icon, PlusSignIcon } from "hugeicons-react";
import { ImportPersonasCSVDialog } from "@/components/clientes/import-csv-dialog";

export default function ClientesPage() {
  const { orgId } = useOrg();
  const [typeFilter, setTypeFilter] = useState<"Cliente" | "Proveedor" | "Trabajador" | "Todos">("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);

  const allClients = useQuery(
    api.clients.get,
    orgId ? { orgId, type: typeFilter === "Todos" ? undefined : typeFilter } : "skip",
  ) as ClientDoc[] | undefined;

  const clients = allClients ? allClients.filter(c => {
    if (!debouncedSearchTerm.trim()) return true;
    const term = debouncedSearchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.documentId && c.documentId.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term))
    );
  }) : undefined;

  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("clientId");
  const isNew = searchParams.get("new") === "1";
  const [selectedClient, setSelectedClient] = useState<ClientDoc | null>(null);
  const [newFormOpen, setNewFormOpen] = useState(() => isNew);

  const selectedClientFromQuery = allClients?.find((c) => c._id === clientId) ?? null;
  const activeClient = selectedClient ?? selectedClientFromQuery;

  useEffect(() => {
    if (isNew) {
      queueMicrotask(() => setNewFormOpen(true));
      router.replace("/clientes", { scroll: false });
      return;
    }
    if (clientId) {
      if (!allClients) return; // wait for clients to load before clearing URL
      router.replace("/clientes", { scroll: false });
    }
  }, [clientId, isNew, allClients, router]);

  useNewShortcut(() => setNewFormOpen(true));
  const { page, setPage, totalPages, paginatedItems: pagedClients, total } = usePagination(clients, 20);

  return (
    <div className="flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden">
      <AppHeader
        title="Personas"
        mobileTitle="Personas"
        toolbar={
          <SearchFilterBar
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Buscar persona por nombre, RUC/CI, correo o empresa"
            isActive={!!searchTerm.trim() || typeFilter !== "Todos"}
            onClear={() => {
              setSearchTerm("");
              setTypeFilter("Todos");
            }}
            selectedOption={typeFilter === "Todos" ? "" : typeFilter}
            onSelectOption={(value) => setTypeFilter((value as typeof typeFilter) || "Todos")}
            options={[
              { value: "Cliente", label: "Clientes" },
              { value: "Proveedor", label: "Proveedores" },
              { value: "Trabajador", label: "Trabajadores" },
            ]}
          />
        }
      >
        {orgId && <ImportPersonasCSVDialog orgId={orgId} />}
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setNewFormOpen(true)}
          aria-label="Nueva persona"
        >
          <PlusSignIcon className="size-4" />
          <span className="hidden sm:inline">Nueva Persona</span>
        </Button>
        <ClienteForm open={newFormOpen} onOpenChange={setNewFormOpen} />
      </AppHeader>
      <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden min-w-0">
        <div className="rounded-md border bg-card flex-1 overflow-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients === undefined ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><div className="flex justify-end"><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay personas registradas.
                </TableCell>
              </TableRow>
            ) : (
              (pagedClients ?? []).map((client) => (
                <TableRow 
                  key={client._id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedClient(client)}
                >
                  <TableCell>{(client.roles && client.roles.length > 0 ? client.roles : [client.type || "Cliente"]).join(", ")}</TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || "-"}</TableCell>
                  <TableCell>{client.company || "-"}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <ClienteForm
                      client={client}
                      trigger={
                        <Button variant="ghost" size="icon" title="Editar">
                          <PencilEdit01Icon className="size-4 text-muted-foreground" />
                        </Button>
                      } 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} total={total} pageSize={20} />
      </main>

      <ClientDetailsSheet 
        client={activeClient} 
        open={!!activeClient} 
        onOpenChange={(open) => !open && setSelectedClient(null)} 
      />
    </div>
  );
}
