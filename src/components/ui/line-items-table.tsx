"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Delete02Icon } from "hugeicons-react";
import { CardFrame } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type BaseLineItem = {
  id: string;
  quantity: number;
  description: string;
  type?: "part" | "service" | "labor";
};

type Props<T extends BaseLineItem> = {
  items: T[];
  emptyMessage?: string;
  editable: boolean;
  onItemClick?: (item: T) => void;
  onRemoveItem?: (itemId: string) => void;
  onQuantitySubmit?: (itemId: string, quantity: number) => void | Promise<void>;
  onUnitPriceSubmit?: (itemId: string, unitPrice: number) => void | Promise<void>;
  showType?: boolean;
  quantityLabel?: string;
  priceLabel?: string;
  totalLabel?: string;
  getUnitPrice: (item: T) => number;
  getTotal: (item: T) => number;
  getPriceSuffix?: (item: T) => ReactNode;
  className?: string;
};

export function LineItemsTable<T extends BaseLineItem>({
  items,
  emptyMessage,
  editable,
  onItemClick,
  onRemoveItem,
  onQuantitySubmit,
  onUnitPriceSubmit,
  showType = false,
  quantityLabel = "Cant",
  priceLabel = "Precio",
  totalLabel = "Total",
  getUnitPrice,
  getTotal,
  getPriceSuffix,
  className,
}: Props<T>) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: "quantity" | "unitPrice" } | null>(null);
  const [draftQuantity, setDraftQuantity] = useState("");
  const [draftUnitPrice, setDraftUnitPrice] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editingCell || editingCell.field !== "quantity") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingCell]);

  useEffect(() => {
    if (!editingCell || editingCell.field !== "unitPrice") return;
    priceInputRef.current?.focus();
    priceInputRef.current?.select();
  }, [editingCell]);

  if (items.length === 0) {
    return emptyMessage ? (
      <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    ) : null;
  }

  return (
    <CardFrame className={className}>
      <Table variant="card">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14 pl-3 pr-2 text-right">{quantityLabel}</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">{priceLabel}</TableHead>
            <TableHead className="text-right">{totalLabel}</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "transition-colors",
                editable && "cursor-pointer hover:bg-muted/50",
                !editable && "cursor-default",
              )}
              onClick={() => {
                if (!editable) return;
                onItemClick?.(item);
              }}
            >
              <TableCell
                className="w-14 pl-3 pr-2 text-right font-medium text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!editable || !onQuantitySubmit) return;
                  setEditingCell({ id: item.id, field: "quantity" });
                  setDraftQuantity(String(item.quantity));
                }}
              >
                {editable && onQuantitySubmit && editingCell?.id === item.id && editingCell.field === "quantity" ? (
                  <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    step="1"
                    value={draftQuantity}
                    onChange={(e) => setDraftQuantity(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") {
                        setEditingCell(null);
                        return;
                      }
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const nextQuantity = Number(draftQuantity);
                      if (!Number.isFinite(nextQuantity) || nextQuantity < 0) return;
                      await onQuantitySubmit(item.id, nextQuantity);
                      setEditingCell(null);
                    }}
                    onBlur={() => setEditingCell(null)}
                    className="h-7 w-full rounded border border-input bg-background px-2 text-right text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  item.quantity
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.description}</span>
                  {showType && item.type ? (
                    <span className="text-xs text-muted-foreground">
                      {item.type === "part" ? "Inventario" : "Servicios"}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell
                className="text-right text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!editable || !onUnitPriceSubmit) return;
                  setEditingCell({ id: item.id, field: "unitPrice" });
                  setDraftUnitPrice(String(getUnitPrice(item)));
                }}
              >
                {editable && onUnitPriceSubmit && editingCell?.id === item.id && editingCell.field === "unitPrice" ? (
                  <input
                    ref={priceInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftUnitPrice}
                    onChange={(e) => setDraftUnitPrice(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={async (e) => {
                      if (e.key === "Escape") {
                        setEditingCell(null);
                        return;
                      }
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const nextUnitPrice = Number(draftUnitPrice);
                      if (!Number.isFinite(nextUnitPrice) || nextUnitPrice < 0) return;
                      await onUnitPriceSubmit(item.id, nextUnitPrice);
                      setEditingCell(null);
                    }}
                    onBlur={() => setEditingCell(null)}
                    className="h-7 w-full rounded border border-input bg-background px-2 text-right text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  `$${getUnitPrice(item).toFixed(2)}`
                )}
                {getPriceSuffix ? <span className="ml-1">{getPriceSuffix(item)}</span> : null}
              </TableCell>
              <TableCell className="text-right font-semibold">${getTotal(item).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {editable && onRemoveItem ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                    title="Eliminar"
                  >
                    <Delete02Icon className="h-4 w-4" />
                  </button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardFrame>
  );
}
