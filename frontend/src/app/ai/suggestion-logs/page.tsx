"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, Eye, X } from "lucide-react";
import { suggestionsApi, usersApi, ApiError, type SuggestionLogData, type UserData } from "@/lib/api";

export default function SuggestionLogsPage() {
  const [logs, setLogs] = useState<SuggestionLogData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [detailLog, setDetailLog] = useState<SuggestionLogData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, usersRes] = await Promise.all([
        suggestionsApi.listLogs({ per_page: 100 }),
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

  const columns: Column<SuggestionLogData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (item) => <span className="text-muted-foreground text-xs">#{item.id}</span> },
    { key: "created_at", label: "เวลา", sortable: true, className: "w-[160px]", render: (item) => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleString("th-TH")}</span> },
    { key: "user_id", label: "ผู้ใช้", sortable: true, render: (item) => <span className="text-sm font-medium">{getUserName(item.user_id)}</span> },
    { key: "input_activity_name", label: "กิจกรรม", render: (item) => <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{item.input_activity_name || "-"}</span> },
    { key: "input_purpose", label: "วัตถุประสงค์", render: (item) => <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{item.input_purpose || "-"}</span> },
    { key: "selected_legal_basis", label: "ฐานกฎหมายที่เลือก", render: (item) => <span className="text-sm">{item.selected_legal_basis || "-"}</span> },
    { key: "accepted", label: "ยอมรับ", render: (item) => {
      if (item.accepted === null) return <span className="text-xs text-muted-foreground">-</span>;
      return <StatusBadge variant={item.accepted ? "success" : "danger"}>{item.accepted ? "ยอมรับ" : "ปฏิเสธ"}</StatusBadge>;
    }},
    { key: "engine_version", label: "เวอร์ชัน", render: (item) => <span className="text-xs font-mono text-muted-foreground">{item.engine_version || "-"}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="AI Suggestion Logs" description="บันทึกการแนะนำฐานกฎหมายจากระบบ AI" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="Suggestion Logs" description="บันทึกการแนะนำฐานกฎหมาย" />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="ค้นหากิจกรรม, วัตถุประสงค์..."
          searchKeys={["input_activity_name", "input_purpose", "selected_legal_basis"]}
          pageSize={10}
          emptyMessage="ไม่พบบันทึกการแนะนำ"
          actions={(item) => (
            <Button variant="ghost" size="icon-xs" onClick={() => setDetailLog(item)} title="ดูรายละเอียด"><Eye className="h-3.5 w-3.5" /></Button>
          )}
        />
      </div>

      {/* Detail Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailLog(null)} />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 shadow-xl mx-4 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">รายละเอียดการแนะนำ #{detailLog.id}</h3>
              </div>
              <button onClick={() => setDetailLog(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">ผู้ใช้</p>
                <p className="text-sm text-foreground">{getUserName(detailLog.user_id)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">กิจกรรม</p>
                <p className="text-sm text-foreground">{detailLog.input_activity_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">วัตถุประสงค์</p>
                <p className="text-sm text-foreground">{detailLog.input_purpose || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">ฐานกฎหมายที่เลือก</p>
                <p className="text-sm text-foreground">{detailLog.selected_legal_basis || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">ผลการแนะนำ (JSON)</p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono max-h-[200px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-foreground">{detailLog.suggestions ? JSON.stringify(detailLog.suggestions, null, 2) : "ไม่มีข้อมูล"}</pre>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">ROPA Record ID</p>
                  <p className="text-sm text-foreground">{detailLog.ropa_record_id ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Engine Version</p>
                  <p className="text-sm font-mono text-foreground">{detailLog.engine_version || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">เวลา</p>
                <p className="text-sm text-foreground">{new Date(detailLog.created_at).toLocaleString("th-TH")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
