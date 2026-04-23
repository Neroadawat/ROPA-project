"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Eye, Loader2, Ban, Pencil } from "lucide-react";
import { ropaRecordsApi, ApiError, type RopaRecordListItem } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "รออนุมัติสร้าง",
  pending_edit_approval: "รออนุมัติแก้ไข",
  pending_delete_approval: "รออนุมัติลบ",
};

const STATUS_VARIANT: Record<string, "warning" | "info" | "purple"> = {
  pending_approval: "warning",
  pending_edit_approval: "info",
  pending_delete_approval: "purple",
};

export default function DpoPendingPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RopaRecordListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<RopaRecordListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await ropaRecordsApi.listPending({ per_page: 100 });
      setRecords(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (record: RopaRecordListItem) => {
    setIsProcessing(true);
    try {
      await ropaRecordsApi.approve(record.id);
      toast.success("อนุมัติ ROPA Record สำเร็จ");
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
      return;
    }
    setIsProcessing(true);
    try {
      await ropaRecordsApi.reject(rejectTarget.id, rejectReason);
      toast.success("ปฏิเสธ ROPA Record สำเร็จ");
      setRejectTarget(null);
      setRejectReason("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: Column<RopaRecordListItem>[] = [
    {
      key: "id", label: "#", className: "w-[60px]",
      render: (item) => <span className="text-muted-foreground">{item.id}</span>,
    },
    {
      key: "process_name", label: "กิจกรรม", sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.process_name || item.activity_name || "-"}</p>
          <p className="text-xs text-muted-foreground">{item.department.name}</p>
        </div>
      ),
    },
    {
      key: "role_type", label: "ประเภท",
      render: (item) => (
        <StatusBadge variant={item.role_type === "Controller" ? "info" : "purple"}>
          {item.role_type}
        </StatusBadge>
      ),
    },
    {
      key: "status", label: "ประเภทคำขอ",
      render: (item) => (
        <StatusBadge variant={STATUS_VARIANT[item.status] ?? "default"}>
          {STATUS_LABEL[item.status] ?? item.status}
        </StatusBadge>
      ),
    },
    {
      key: "rejection_info", label: "หมายเหตุ",
      render: (item) => {
        const hasRejection = item.rejection_reason;
        const hasEdit = item.edit_reason;
        
        return (
          <div className="text-xs space-y-3">
            {hasRejection && (
              <div>
                <span className="text-red-400 font-medium block mb-1"><Ban className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5 text-red-400" />ปฏิเสธ:</span>
                <p className="text-muted-foreground">{item.rejection_reason}</p>
                {item.rejected_by && item.rejected_at && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    โดย {item.rejected_by.name} เมื่อ {new Date(item.rejected_at).toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
            )}
            
            {hasEdit && (
              <div>
                <span className="text-blue-400 font-medium block mb-1"><Pencil className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5 text-blue-400" />แก้ไข:</span>
                <p className="text-muted-foreground">{item.edit_reason}</p>
                {item.edited_by && item.edited_at && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    โดย {item.edited_by.name} เมื่อ {new Date(item.edited_at).toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
            )}
            
            {!hasRejection && !hasEdit && (
              <span className="text-muted-foreground/50">-</span>
            )}
          </div>
        );
      },
    },
    {
      key: "created_at", label: "วันที่ส่ง", sortable: true,
      render: (item) => (
        <span className="text-muted-foreground text-xs">
          {new Date(item.created_at).toLocaleDateString("th-TH")}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="อนุมัติ ROPA" description="ตรวจสอบและอนุมัติ ROPA Records ที่รอดำเนินการ" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="อนุมัติ ROPA" description="ตรวจสอบและอนุมัติ ROPA Records ที่รอดำเนินการ" />
      <div className="p-6">
        <DataTable
          columns={columns}
          data={records}
          searchPlaceholder="ค้นหา..."
          searchKeys={["process_name", "activity_name"]}
          pageSize={20}
          emptyMessage="ไม่มีรายการรออนุมัติ"
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => router.push(`/ropa-records/${item.id}`)} title="ดูรายละเอียด">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => handleApprove(item)} disabled={isProcessing}
                title="อนุมัติ" className="text-emerald-400 hover:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setRejectTarget(item)}
                title="ปฏิเสธ" className="text-destructive hover:text-destructive">
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        />
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setRejectTarget(null); setRejectReason(""); }} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-xl mx-4 bg-white">
            <h3 className="text-base font-semibold text-foreground mb-2">ปฏิเสธ ROPA Record</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ปฏิเสธ &quot;{rejectTarget.process_name || rejectTarget.activity_name || `Record #${rejectTarget.id}`}&quot;
            </p>
            <div className="mb-4">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-foreground mb-1">เหตุผลในการปฏิเสธ *</label>
              <Input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล..." className="h-10 rounded-lg" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }} className="rounded-lg">ยกเลิก</Button>
              <Button variant="destructive" onClick={handleReject} disabled={isProcessing} className="rounded-lg">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}ปฏิเสธ
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
