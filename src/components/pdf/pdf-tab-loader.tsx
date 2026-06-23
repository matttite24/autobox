"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export function PdfTabLoader({
  pdfDocument,
  title,
}: {
  pdfDocument: ReactElement;
  title: string;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const blob = await pdf(pdfDocument as any).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        window.document.title = title;
        window.location.replace(url);
      } catch {
        if (!cancelled) setError("No se pudo generar el PDF.");
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [pdfDocument, title]);

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }

  return <div className="p-6 text-sm text-muted-foreground">Generando PDF...</div>;
}
