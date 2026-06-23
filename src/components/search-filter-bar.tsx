"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Cancel01Icon, Search01Icon } from "hugeicons-react";

export type SearchFilterOption = {
  label: string;
  value: string;
};

type SearchFilterBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  isActive?: boolean;
  className?: string;
  options?: SearchFilterOption[];
  selectedOption?: string;
  onSelectOption?: (value: string) => void;
};

export function SearchFilterBar({
  value,
  onValueChange,
  placeholder,
  onClear,
  isActive,
  className = "",
  options = [],
  selectedOption,
  onSelectOption,
}: SearchFilterBarProps) {
  const hasActiveState = isActive ?? value.trim().length > 0;
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === selectedOption) ?? null,
    [options, selectedOption],
  );

  const visibleOptions = useMemo(
    () =>
      options.filter((option) => {
        if (selectedOption && option.value === selectedOption) return false;
        const term = value.trim().toLowerCase();
        return !term || option.label.toLowerCase().includes(term);
      }),
    [options, selectedOption, value],
  );

  return (
    <div className={cn("relative w-full max-w-md min-w-0 mx-auto", className)}>
      <InputGroup>
        <InputGroupAddon>
          <Search01Icon />
          {selected ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {selected.label}
              {onSelectOption ? (
                <button
                  aria-label={`Quitar ${selected.label}`}
                  className="rounded-full p-0.5 hover:bg-background/50"
                  onClick={() => onSelectOption("")}
                  type="button"
                >
                  <Cancel01Icon className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          ) : null}
        </InputGroupAddon>

        <InputGroupInput
          autoComplete="off"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          ref={inputRef}
          type="search"
          value={value}
        />

        {onClear ? (
          <InputGroupAddon align="inline-end">
            <Button
              aria-label="Borrar búsqueda y filtros"
              disabled={!hasActiveState && !selected}
              onClick={onClear}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Cancel01Icon />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {open && visibleOptions.length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-xl border bg-popover p-1 shadow-lg/5">
          {visibleOptions.map((option) => (
            <button
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              key={option.value}
              onClick={() => {
                onSelectOption?.(option.value);
                onValueChange("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              onMouseDown={(e) => e.preventDefault()}
              type="button"
            >
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">Añadir</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
