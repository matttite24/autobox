"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserCircleIcon, Logout01Icon, Mail01Icon } from "hugeicons-react";

type Props = { visible: boolean };

export function PerfilSettingsSection({ visible }: Props) {
  const currentUser = useQuery(api.users.currentUser, {});
  const { signOut } = useAuthActions();
  const router = useRouter();

  if (!visible) return null;

  const displayName = currentUser?.name ?? currentUser?.email?.split("@")[0] ?? "Usuario";
  const email = currentUser?.email ?? "";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Perfil</h2>
        <p className="text-sm text-muted-foreground">Información de tu cuenta y sesión activa.</p>
      </div>

      {/* Tarjeta de usuario */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircleIcon className="size-8" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">{displayName}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail01Icon className="size-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h3 className="text-sm font-semibold">Sesión</h3>
        <p className="text-sm text-muted-foreground">
          Al cerrar sesión tendrás que volver a ingresar tus credenciales para acceder al sistema.
        </p>
        <Button
          variant="destructive"
          className="gap-2"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          <Logout01Icon className="size-4" />
          Cerrar sesión
        </Button>
      </div>
    </section>
  );
}
