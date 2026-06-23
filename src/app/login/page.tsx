"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench01Icon, CheckmarkCircle02Icon } from "hugeicons-react";

type Mode = "login" | "register";
type Status = "idle" | "loading" | "success";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const updateOrg = useMutation(api.organizations.updateCurrent);
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register-only fields
  const [tallerName, setTallerName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("loading");

    try {
      if (mode === "register") {
        await signIn("password", { email, password, flow: "signUp" });
        if (tallerName.trim()) {
          try {
            await updateOrg({ name: tallerName.trim() });
          } catch {
            // Account created; name update failed. User can update from settings.
          }
        }
      } else {
        await signIn("password", { email, password, flow: "signIn" });
      }

      // Show success animation, then redirect
      setStatus("success");
      setTimeout(() => {
        router.push("/inicio");
      }, 1200);
    } catch (err: any) {
      setStatus("idle");
      if (err?.message?.includes("InvalidSecret")) {
        setError("Contraseña incorrecta.");
      } else if (err?.message?.includes("Invalid password")) {
        setError("La contraseña debe tener mínimo 8 caracteres.");
      } else if (err?.message?.includes("InvalidAccountId") && mode === "login") {
        setError("Cuenta no encontrada. ¿Ya te registraste?");
      } else if (err?.message?.includes("InvalidAccountId")) {
        setError("Error al crear la cuenta. Inténtalo de nuevo.");
      } else {
        setError("Error de autenticación. Verifica tus credenciales.");
      }
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError("");
    setStatus("idle");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">

        {/* Success animation overlay */}
        {status === "success" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            style={{ animation: "fadeIn 0.2s ease" }}
          >
            <div
              className="flex flex-col items-center gap-4"
              style={{ animation: "scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              <div className="text-emerald-500" style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
                <CheckmarkCircle02Icon className="size-24 drop-shadow-lg" />
              </div>
              <p className="text-lg font-semibold text-foreground">
                {mode === "register" ? "¡Cuenta creada!" : "¡Bienvenido!"}
              </p>
              <p className="text-sm text-muted-foreground">Redirigiendo…</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div
          className="bg-background rounded-2xl border shadow-lg overflow-hidden"
          style={{
            transition: "opacity 0.3s",
            opacity: status === "success" ? 0.4 : 1,
          }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b bg-muted/20">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Wrench01Icon className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login"
                ? "Accede a tu taller en Autobox"
                : "Registra tu taller en Autobox"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Workshop name — only on register */}
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="tallerName">Nombre del taller</Label>
                <Input
                  id="tallerName"
                  type="text"
                  placeholder="Ej: Taller Martínez"
                  value={tallerName}
                  onChange={(e) => setTallerName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={mode === "login"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold mt-2"
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading"
                ? "Procesando…"
                : mode === "login"
                ? "Entrar"
                : "Crear cuenta"}
            </Button>
          </form>

          {/* Footer switch */}
          <div className="px-8 pb-7 text-center text-sm text-muted-foreground">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(5deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
      `}</style>
    </div>
  );
}
