"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Eye, X, Loader2 } from "lucide-react";
import { auditLogsApi, usersApi, ApiError, type AuditLogData, type UserData } from "@/lib/api";

const ACTION_BADGE: Record<string, { variant: "success" | "info" | "danger" | "warning" | "purple"; label: string }> = {
  create: { variant: "success", label: "สร้าง" },
  update: { variant: "info", label: "แก้ไข" },
  delete: { variant: "danger", label: "ลบ" },
  import: { variant: "purple", label: "นำเข้า" },
  export: { variant: "warning", label: "ส่งออก" },
};

const TABLE_LABELS: Record<string, string> = {
  ropa_records: "ROPA Records", users: "ผู้ใช้", departments: "แผนก",
  controllers: "Controllers", processors: "Processors",
  data_subject_categories: "กลุ่มเจ้าของข้อมูล", personal_data_types: "ประเภทข้อมูล",
};

function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  if (!data) return <span className="text-muted-foreground text-xs italic">ไม่มีข้อมูล</span>;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
      <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono space-y-1 max-h-[200px] overflow-y-auto">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-primary font-medium shrink-0">{key}:</span>
            <span className="text-foreground break-all">{JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState<AuditLogData | null>(null);
  const [filterAction, setFilterAction] = useState("");
  const [filterTable, setFilterTable] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, usersRes] = await Promise.all([
        auditLogsApi.list({ per_page: 100 }),
        usersApi.list({ per_page: 100 }),
      ]);
      setLogs(logsRes.items);
      const map: Record<number, UserData> = {};
      usersRes.items.forEach((u) => { map[u.id] = u; });
      setUsersMap(map);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserName = (userId: number) => usersMap[userId]?.name ?? `User #${userId}`;
  const getUserEmail = (userId: number) => usersMap[userId]?.email ?? "";

  let filteredData = logs;
  if (filterAction) filteredData = filteredData.filter((l) => l.action === filterAction);
  if (filterTable) filteredData = filteredData.filter((l) => l.table_name === filterTable);

  const columns: Column<AuditLogData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (item) => <span className="text-muted-foreground text-xs">#{item.id}</span> },
    { key: "created_at", label: "เวลา", sortable: true, className: "w-[160px]", render: (item) => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleString("th-TH")}</span> },
    { key: "user_id", label: "ผู้ดำเนินการ", sortable: true, render: (item) => (<div><p className="font-medium text-foreground text-sm">{getUserName(item.user_id)}</p><p className="text-xs text-muted-foreground">{getUserEmail(item.user_id)}</p></div>) },
    { key: "action", label: "การดำเนินการ", sortable: true, render: (item) => { const b = ACTION_BADGE[item.action]; return b ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge> : item.action; } },
    { key: "table_name", label: "ตาราง", sortable: true, render: (item) => <span className="text-sm">{TABLE_LABELS[item.table_name] ?? item.table_name}</span> },
    { key: "record_id", label: "Record ID", className: "w-[90px]", render: (item) => <span className="text-xs font-mono text-muted-foreground">{item.record_id || "-"}</span> },
    { key: "reason", label: "เหตุผล", render: (item) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{item.reason || "-"}</span> },
  ];

  const uniqueTables = [...new Set(logs.map((l) => l.table_name))];

  if (loading) {
    return (<DashboardLayout><Header title="Audit Logs" description="บันทึกการเปลี่ยนแปลงทั้งหมดในระบบ" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="Audit Logs" description="บันทึกการเปลี่ยนแปลงทั้งหมดในระบบ" />
      <div className="p-6">
        <DataTable columns={columns} data={filteredData} searchPlaceholder="ค้นหาเหตุผล..." searchKeys={["reason"]} pageSize={10} emptyMessage="ไม่พบบันทึก"
          filters={
            <div className="flex items-center gap-2">
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกการดำเนินการ</option>
                {Object.entries(ACTION_BADGE).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
              </select>
              <select value={filterTable} onChange={(e) => setFilterTable(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกตาราง</option>
                {uniqueTables.map((t) => <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>)}
              </select>
            </div>
          }
          actions={(item) => <Button variant="ghost" size="icon-xs" onClick={() => setDetailLog(item)} title="ดูรายละเอียด"><Eye className="h-3.5 w-3.5" /></Button>}
        />
      </div>

      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailLog(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 shadow-xl mx-4 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-semibold text-foreground">Audit Log #{detailLog.id}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{new Date(detailLog.created_at).toLocaleString("th-TH")}</p>
              </div>
              <button onClick={() => setDetailLog(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">ผู้ดำเนินการ</p><p className="text-sm font-medium">{getUserName(detailLog.user_id)}</p><p className="text-xs text-muted-foreground">{getUserEmail(detailLog.user_id)}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">การดำเนินการ</p>{(() => { const b = ACTION_BADGE[detailLog.action]; return b ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge> : detailLog.action; })()}</div>
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">ตาราง</p><p className="text-sm">{TABLE_LABELS[detailLog.table_name] ?? detailLog.table_name}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Record ID</p><p className="text-sm font-mono">{detailLog.record_id || "-"}</p></div>
              </div>
              {detailLog.reason && <div><p className="text-xs font-semibold text-muted-foreground mb-1">เหตุผล</p><p className="text-sm bg-muted/50 rounded-lg p-3">{detailLog.reason}</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JsonViewer data={detailLog.old_value} label="ค่าก่อนเปลี่ยนแปลง (Old)" />
                <JsonViewer data={detailLog.new_value} label="ค่าหลังเปลี่ยนแปลง (New)" />
              </div>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setDetailLog(null)} className="rounded-lg">ปิด</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
