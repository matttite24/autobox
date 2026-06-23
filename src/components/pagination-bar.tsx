"use client";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaginationBarProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
};

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize = 10,
}: PaginationBarProps) {
  const safeTotal = total ?? 0;
  
  const resultRanges = Array.from({ length: Math.max(1, totalPages) }, (_, i) => {
    if (safeTotal === 0) return { label: "0-0", value: 1 };
    const start = i * pageSize + 1;
    const end = Math.min((i + 1) * pageSize, safeTotal);
    const pageNum = i + 1;
    return { label: `${start}-${end}`, value: pageNum };
  });

  return (
    <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
      {/* Selector de rango de resultados */}
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <p className="text-muted-foreground text-xs sm:text-sm">Mostrando</p>
        <Select
          items={resultRanges}
          onValueChange={(value) => onPageChange(value as number)}
          value={page}
        >
          <SelectTrigger
            aria-label="Seleccionar rango de resultados"
            className="w-20 sm:w-fit sm:min-w-none"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup popupClassName="min-w-24">
            {resultRanges.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <p className="hidden sm:block text-muted-foreground text-sm">
          de{" "}
          <strong className="font-medium text-foreground">
            {safeTotal}
          </strong>{" "}
          resultados
        </p>
      </div>

      {/* Paginación */}
      <div className="shrink-0">
        <Pagination>
          <PaginationContent className="w-full justify-between gap-2">
            <PaginationItem>
              <PaginationPrevious
                className="sm:*:[svg]:hidden"
                render={
                  <Button
                    disabled={page <= 1}
                    onClick={() => page > 1 && onPageChange(page - 1)}
                    size="sm"
                    variant="outline"
                  />
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                className="sm:*:[svg]:hidden"
                render={
                  <Button
                    disabled={page >= totalPages || totalPages === 0}
                    onClick={() => page < totalPages && onPageChange(page + 1)}
                    size="sm"
                    variant="outline"
                  />
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
