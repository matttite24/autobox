import { useEffect, useState } from "react";

export function usePagination<T>(items: T[] | undefined, pageSize = 20) {
  const [page, setPage] = useState(1);

  // Reset to first page when the dataset changes (search/filter)
  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalPages = items ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const paginatedItems = items?.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    paginatedItems,
    total: items?.length ?? 0,
  };
}
