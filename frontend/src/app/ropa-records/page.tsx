"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Eye, Pencil, Trash2, Loader2, FileText, History, AlertTriangle, Download,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  ropaRecordsApi, departmentsApi, exportApi, ApiError,
  type RopaRecordListItem, type DepartmentData,
} from "@/lib/api";

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "info" | "purple" | "default"; label: string }> = {
  pending_approval: { variant: "warning", label: "รออนุมัติ" },
  approved: { variant: "success", label: "อนุมัติแล้ว" },
  rejected: { variant: "danger", label: "ถูกปฏิเสธ" },
  pending_edit_approval: { variant: "info", label: "รออนุมัติแก้ไข" },
  pending_delete_approval: { variant: "purple", label: "รออนุมัติลบ" },
};

const RISK_BADGE: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  Low: { variant: "success", label: "ต่ำ" },
  Medium: { variant: "warning", label: "กลาง" },
  High: { variant: "danger", label: "สูง" },
};

export default function RopaRecordsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [records, setRecords] = useState<RopaRecordListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filters
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRoleType, setFilterRoleType] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<RopaRecordListItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const canCreate = user?.role !== "Viewer_Auditor";
  const isAdmin = user?.role === "Admin";
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportApi.excel({
        search: search || undefined,
        department_id: filterDept ? Number(filterDept) : undefined,
        role_type: filterRoleType || undefined,
        risk_level: filterRisk || undefined,
        status: filterStatus || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ropa-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("ส่งออกข้อมูลสำเร็จ");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถส่งออกข้อมูลได้");
    } finally {
      setExporting(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, deptsRes] = await Promise.all([
        ropaRecordsApi.list({
          page, per_page: perPage, search: search || undefined,
          department_id: filterDept ? Number(filterDept) : undefined,
          role_type: filterRoleType || undefined,
          risk_level: filterRisk || undefined,
          status: filterStatus || undefined,
          sort_by: "created_at",
          sort_order: "desc",
        }),
        departmentsApi.list({ per_page: 100 }),
      ]);
      setRecords(res.items);
      setTotal(res.total);
      setDepartments(deptsRes.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDept, filterRoleType, filterRisk, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการลบ");
      return;
    }
    try {
      await ropaRecordsApi.delete(deleteTarget.id, deleteReason);
      toast.success("ส่งคำขอลบ ROPA Record สำเร็จ");
      setDeleteTarget(null);
      setDeleteReason("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    }
  };

  const columns: Column<RopaRecordListItem>[] = [
    {
      key: "id", label: "#", className: "w-[60px]",
      render: (item) => <span className="text-muted-foreground">{item.id}</span>,
    },
    {
      key: "activity_name", label: "กิจกรรม", sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.activity_name || "-"}</p>
          <p className="text-xs text-muted-foreground">{item.department.name}</p>
        </div>
      ),
    },
    {
      key: "role_type", label: "ประเภท", sortable: true,
      render: (item) => (
        <StatusBadge variant={item.role_type === "Controller" ? "info" : "purple"}>
          {item.role_type}
        </StatusBadge>
      ),
    },
    {
      key: "risk_level", label: "ความเสี่ยง", sortable: true,
      render: (item) => {
        const b = item.risk_level ? RISK_BADGE[item.risk_level] : null;
        return b ? <StatusBadge variant={b.variant} dot>{b.label}</StatusBadge> : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "status", label: "สถานะ", sortable: true,
      render: (item) => {
        const b = STATUS_BADGE[item.status];
        return b ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge> : <StatusBadge>{item.status}</StatusBadge>;
      },
    },
    {
      key: "created_at", label: "สร้างเมื่อ", sortable: true,
      render: (item) => (
        <span className="text-muted-foreground text-xs">
          {new Date(item.created_at).toLocaleDateString("th-TH")}
        </span>
      ),
    },
  ];

  if (loading && records.length === 0) {
    return (
      <DashboardLayout>
        <Header title="ROPA Records" description="จัดการ Record of Processing Activities" />
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="ROPA Records"
        description="จัดการ Record of Processing Activities"
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" className="rounded-lg gap-1.5" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                ส่งออก Excel
              </Button>
            )}
            <Button variant="outline" className="rounded-lg gap-1.5" onClick={() => router.push("/ropa-records/retention-alerts")}>
              <AlertTriangle className="h-4 w-4" />การแจ้งเตือน
            </Button>
            {canCreate && (
              <Button onClick={() => router.push("/ropa-records/new")} className="rounded-lg gap-1.5">
                <Plus className="h-4 w-4" />สร้าง ROPA
              </Button>
            )}
          </div>
        }
      />
      <div className="p-6 relative">
        {loading && records.length > 0 && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <DataTable
          columns={columns}
          data={records}
          searchPlaceholder="ค้นหาชื่อกิจกรรม..."
          searchKeys={["activity_name"]}
          pageSize={perPage}
          emptyMessage="ไม่พบ ROPA Record"
          total={total}
          currentPage={page}
          onPageChange={setPage}
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกแผนก</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={filterRoleType} onChange={(e) => { setFilterRoleType(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกประเภท</option>
                <option value="Controller">Controller</option>
                <option value="Processor">Processor</option>
              </select>
              <select value={filterRisk} onChange={(e) => { setFilterRisk(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกระดับความเสี่ยง</option>
                <option value="Low">ต่ำ</option>
                <option value="Medium">กลาง</option>
                <option value="High">สูง</option>
              </select>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกสถานะ</option>
                <option value="pending_approval">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ถูกปฏิเสธ</option>
                <option value="pending_edit_approval">รออนุมัติแก้ไข</option>
                <option value="pending_delete_approval">รออนุมัติลบ</option>
              </select>
            </div>
          }
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/ropa-records/${item.id}`)} title="ดูรายละเอียด">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/ropa-records/${item.id}/versions`)} title="ประวัติเวอร์ชัน">
                <History className="h-3.5 w-3.5" />
              </Button>
              {canCreate && !item.is_deleted && (
                <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/ropa-records/${item.id}?edit=true`)} title="แก้ไข">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {canCreate && !item.is_deleted && (
                <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(item)} title="ลบ" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        />
      </div>

      {/* Delete confirmation with reason */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDeleteTarget(null); setDeleteReason(""); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-xl mx-4 bg-white">
            <h3 className="text-base font-semibold text-foreground mb-2">ลบ ROPA Record</h3>
            <p className="text-sm text-muted-foreground mb-4">
              คุณต้องการลบ &quot;{deleteTarget.activity_name || `Record #${deleteTarget.id}`}&quot; ใช่หรือไม่?
            </p>
            <div className="mb-4">
              <label htmlFor="delete-reason" className="block text-sm font-medium text-foreground mb-1">เหตุผลในการลบ *</label>
              <Input
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
                className="h-10 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteReason(""); }} className="rounded-lg">ยกเลิก</Button>
              <Button variant="destructive" onClick={handleDelete} className="rounded-lg">ลบ</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
