"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2 } from "lucide-react";
import { userLogsApi, usersApi, ApiError, type UserSessionLogData, type UserData } from "@/lib/api";

const ROLE_BADGE: Record<string, { variant: "info" | "purple" | "success" | "warning"; label: string }> = {
  Admin: { variant: "info", label: "Admin" },
  DPO: { variant: "purple", label: "DPO" },
  Department_User: { variant: "success", label: "Dept User" },
  Viewer_Auditor: { variant: "warning", label: "Viewer" },
};

export default function UserLogsPage() {
  const [logs, setLogs] = useState<UserSessionLogData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, usersRes] = await Promise.all([
        userLogsApi.list({ per_page: 100 }),
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

  const getUser = (userId: number) => usersMap[userId];

  let filteredData = logs;
  if (filterAction) filteredData = filteredData.filter((l) => l.action === filterAction);

  const columns: Column<UserSessionLogData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (item) => <span className="text-muted-foreground text-xs">#{item.id}</span> },
    { key: "created_at", label: "เวลา", sortable: true, className: "w-[160px]", render: (item) => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleString("th-TH")}</span> },
    { key: "user_id", label: "ผู้ใช้", sortable: true, render: (item) => { const u = getUser(item.user_id); return (<div><p className="font-medium text-foreground text-sm">{u?.name ?? `User #${item.user_id}`}</p><p className="text-xs text-muted-foreground">{u?.email ?? ""}</p></div>); } },
    { key: "user_role", label: "บทบาท", render: (item) => { const u = getUser(item.user_id); const b = u ? ROLE_BADGE[u.role] : null; return b ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge> : "-"; } },
    { key: "action", label: "การดำเนินการ", sortable: true, render: (item) => <StatusBadge variant={item.action === "login" ? "success" : "default"} dot>{item.action === "login" ? "เข้าสู่ระบบ" : "ออกจากระบบ"}</StatusBadge> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="User Session Logs" description="บันทึกการเข้าสู่ระบบและออกจากระบบของผู้ใช้" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="User Session Logs" description="บันทึกการเข้าสู่ระบบและออกจากระบบของผู้ใช้" />
      <div className="p-6">
        <DataTable columns={columns} data={filteredData} searchPlaceholder="ค้นหาชื่อผู้ใช้, IP..." searchKeys={["ip_address"]} pageSize={10} emptyMessage="ไม่พบบันทึก"
          filters={
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option value="">ทุกการดำเนินการ</option>
              <option value="login">เข้าสู่ระบบ</option>
              <option value="logout">ออกจากระบบ</option>
            </select>
          }
        />
      </div>
    </DashboardLayout>
  );
}
