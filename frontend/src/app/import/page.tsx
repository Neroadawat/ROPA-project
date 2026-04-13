"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, History } from "lucide-react";
import {
  importApi, usersApi, ApiError,
  type ImportPreviewData, type ImportRowError, type ImportBatchData, type UserData,
} from "@/lib/api";

type ViewMode = "upload" | "preview" | "history";

export default function ImportPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [batches, setBatches] = useState<ImportBatchData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, UserData>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const [batchRes, usersRes] = await Promise.all([
        importApi.listBatches({ per_page: 100 }),
        usersApi.list({ per_page: 100 }),
      ]);
      setBatches(batchRes.items);
      const map: Record<number, UserData> = {};
      usersRes.items.forEach((u) => { map[u.id] = u; });
      setUsersMap(map);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith(".xlsx")) {
      toast.error("กรุณาเลือกไฟล์ .xlsx เท่านั้น");
      return;
    }
    setFile(selected);
  };

  const handlePreview = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await importApi.preview(file);
      setPreview(result);
      setViewMode("preview");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถอ่านไฟล์ได้");
    } finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setConfirming(true);
    try {
      const result = await importApi.confirm(file);
      toast.success(`นำเข้าสำเร็จ ${result.rows_success} แถว`);
      setPreview(null);
      setFile(null);
      setViewMode("history");
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาดในการนำเข้า");
    } finally { setConfirming(false); }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setViewMode("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getUserName = (userId: number) => usersMap[userId]?.name ?? `User #${userId}`;

  const errorColumns: Column<ImportRowError>[] = [
    { key: "sheet_name", label: "ชีต", render: (item) => <span className="text-sm font-medium">{item.sheet_name}</span> },
    { key: "row_number", label: "แถว", render: (item) => <span className="text-sm text-muted-foreground">{item.row_number}</span> },
    { key: "field_name", label: "ฟิลด์", render: (item) => <span className="text-sm font-mono text-primary">{item.field_name}</span> },
    { key: "error_reason", label: "สาเหตุ", render: (item) => <span className="text-sm text-destructive">{item.error_reason}</span> },
  ];

  const batchColumns: Column<ImportBatchData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (item) => <span className="text-muted-foreground text-xs">#{item.id}</span> },
    { key: "filename", label: "ไฟล์", render: (item) => (
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium">{item.filename}</span>
      </div>
    )},
    { key: "imported_by", label: "นำเข้าโดย", render: (item) => <span className="text-sm text-muted-foreground">{getUserName(item.imported_by)}</span> },
    { key: "rows_success", label: "สำเร็จ", render: (item) => <span className="text-sm text-emerald-400">{item.rows_success}</span> },
    { key: "rows_failed", label: "ล้มเหลว", render: (item) => <span className="text-sm text-destructive">{item.rows_failed}</span> },
    { key: "status", label: "สถานะ", render: (item) => <StatusBadge variant={item.status === "completed" ? "success" : item.status === "failed" ? "danger" : "warning"}>{item.status === "completed" ? "สำเร็จ" : item.status === "failed" ? "ล้มเหลว" : item.status}</StatusBadge> },
    { key: "created_at", label: "เวลา", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleString("th-TH")}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="นำเข้า Excel" description="นำเข้าข้อมูล ROPA จากไฟล์ Excel (.xlsx)" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="นำเข้า Excel" description="นำเข้าข้อมูล ROPA จากไฟล์ Excel (.xlsx)" />
      <div className="p-6">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/50 w-fit">
          <button onClick={() => setViewMode("upload")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "upload" || viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Upload className="h-4 w-4 inline-block mr-2" />นำเข้าไฟล์
          </button>
          <button onClick={() => { setViewMode("history"); fetchBatches(); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <History className="h-4 w-4 inline-block mr-2" />ประวัติการนำเข้า ({batches.length})
          </button>
        </div>

        {(viewMode === "upload" || viewMode === "preview") && !preview && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">เลือกไฟล์ Excel เพื่อนำเข้า</p>
            <p className="text-sm text-muted-foreground mb-6">รองรับเฉพาะไฟล์ .xlsx เท่านั้น</p>
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <div className="flex items-center justify-center gap-3">
              <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <FileSpreadsheet className="h-4 w-4" />เลือกไฟล์
              </label>
              {file && (
                <>
                  <span className="text-sm text-muted-foreground">{file.name}</span>
                  <Button onClick={handlePreview} disabled={uploading} className="rounded-lg gap-1.5">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังอ่าน...</> : "ตรวจสอบข้อมูล"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === "preview" && preview && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">แถวทั้งหมด</p>
                <p className="text-2xl font-bold text-foreground">{preview.total_rows}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><p className="text-sm text-muted-foreground">ถูกต้อง</p></div>
                <p className="text-2xl font-bold text-emerald-400">{preview.valid_count}</p>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /><p className="text-sm text-muted-foreground">มีข้อผิดพลาด</p></div>
                <p className="text-2xl font-bold text-destructive">{preview.error_count}</p>
              </div>
            </div>

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-foreground">รายการข้อผิดพลาด</h3>
                </div>
                <DataTable columns={errorColumns} data={preview.errors} pageSize={5} emptyMessage="ไม่มีข้อผิดพลาด" searchPlaceholder="ค้นหา..." searchKeys={["field_name", "error_reason"]} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleCancel} className="rounded-lg">ยกเลิก</Button>
              <Button onClick={handleConfirm} disabled={confirming || preview.valid_count === 0} className="rounded-lg gap-1.5">
                {confirming ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังนำเข้า...</> : <><CheckCircle2 className="h-4 w-4" />ยืนยันนำเข้า ({preview.valid_count} แถว)</>}
              </Button>
            </div>
          </div>
        )}

        {viewMode === "history" && (
          <DataTable columns={batchColumns} data={batches} searchPlaceholder="ค้นหาชื่อไฟล์..." searchKeys={["filename"]} pageSize={10} emptyMessage="ยังไม่มีประวัติการนำเข้า" />
        )}
      </div>
    </DashboardLayout>
  );
}
