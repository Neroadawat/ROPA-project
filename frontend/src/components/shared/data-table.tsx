"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  emptyMessage?: string;
  actions?: (item: T) => React.ReactNode;
  filters?: React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T extends object>({
  columns, data, searchPlaceholder = "ค้นหา...", searchKeys = [],
  pageSize = 10, emptyMessage = "ไม่พบข้อมูล", actions, filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const getField = (item: T, key: string): unknown =>
    (item as unknown as Record<string, unknown>)[key];

  const filtered = data.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (searchKeys.length === 0) {
      return Object.values(item as unknown as Record<string, unknown>).some(
        (v) => String(v ?? "").toLowerCase().includes(q)
      );
    }
    return searchKeys.some((key) =>
      String(getField(item, key) ?? "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = String(getField(a, sortKey) ?? "");
    const bVal = String(getField(b, sortKey) ?? "");
    return sortDir === "asc" ? aVal.localeCompare(bVal, "th") : bVal.localeCompare(aVal, "th");
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = sorted.slice(start, start + pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir(null); }
    } else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-600" />;
    if (sortDir === "asc") return <ArrowUp className="h-3.5 w-3.5 text-red-500" />;
    return <ArrowDown className="h-3.5 w-3.5 text-red-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 rounded-lg bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:border-red-500 focus-visible:ring-red-500/20"
          />
        </div>
        {filters}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400",
                      col.sortable && "cursor-pointer select-none hover:text-white transition-colors",
                      col.className
                    )}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-[100px]">จัดการ</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-12 text-center text-slate-500">{emptyMessage}</td></tr>
              ) : (
                paged.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-150">
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3.5 text-slate-700", col.className)}>
                        {col.render ? col.render(item, start + idx) : String(getField(item, col.key) ?? "-")}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">{actions(item)}</div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <p className="text-xs text-slate-400">แสดง {start + 1}-{Math.min(start + pageSize, sorted.length)} จาก {sorted.length} รายการ</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-xs" onClick={() => setPage(1)} disabled={safePage <= 1} className="text-slate-400 hover:text-slate-700"><ChevronsLeft className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="text-slate-400 hover:text-slate-700"><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="px-3 text-xs font-medium text-slate-500">{safePage} / {totalPages}</span>
              <Button variant="ghost" size="icon-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="text-slate-400 hover:text-slate-700"><ChevronRight className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages} className="text-slate-400 hover:text-slate-700"><ChevronsRight className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
