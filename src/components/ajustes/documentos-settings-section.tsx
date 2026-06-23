"use client";

type Props = { visible: boolean };

export function DocumentosSettingsSection({ visible }: Props) {
  if (!visible) return null;
  return (
    <section className="mx-auto w-full max-w-3xl space-y-1">
      <h2 className="text-lg font-semibold">Documentos</h2>
      <p className="text-sm text-muted-foreground">Logo, pie de página y datos fiscales quedan listos para impresión.</p>
    </section>
  );
}
