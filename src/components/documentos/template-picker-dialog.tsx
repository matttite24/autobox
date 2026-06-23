"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type TemplateRecord } from "@/lib/document-templates";

export function TemplatePickerDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateRecord[];
  onSelect: (template: TemplateRecord) => void;
  }) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Elegir plantilla</AlertDialogTitle>
          <AlertDialogDescription>
            Selecciona la plantilla que quieres usar para imprimir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 px-6 pb-4">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selectedId === template.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground">{template.kind} · {template.format}</div>
            </button>
          ))}
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              const template = templates.find((item) => item.id === selectedId);
              if (template) onSelect(template);
              onOpenChange(false);
            }}
          >
            Usar plantilla
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
