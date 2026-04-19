"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, History, ChevronDown, ChevronRight, AlertCircle, Info } from "lucide-react";
import {
  importApi, usersApi, departmentsApi, ApiError,
  type ImportPreviewData, type ImportRowError, type ImportBatchData, type UserData, type ImportRowData,
} from "@/lib/api";

type ViewMode = "upload" | "preview" | "history";

interface DepartmentData {
  id: number;
  name: string;
  code: string;
}

export default function ImportPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [batches, setBatches] = useState<ImportBatchData[]>([]);
  const [usersMap, setUsersMap] = useState<Record<number, UserData>>({});
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  // Store selected controller/processor IDs for each row
  const [rowControllerMapping, setRowControllerMapping] = useState<Record<string, number | null>>({});
  const [rowProcessorMapping, setRowProcessorMapping] = useState<Record<string, number | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const [batchRes, usersRes, deptRes] = await Promise.all([
        importApi.listBatches({ per_page: 100 }),
        usersApi.list({ per_page: 100 }),
        departmentsApi.list({ per_page: 100 }),
      ]);
      setBatches(batchRes.items);
      const map: Record<number, UserData> = {};
      usersRes.items.forEach((u) => { map[u.id] = u; });
      setUsersMap(map);
      
      const depts = deptRes.items || [];
      setDepartments(depts);
      setSelectedDepartment(prev => prev || (depts.length > 0 ? depts[0].id : null));
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
      // Initialize expanded sheets
      const sheets = new Set(result.valid_rows.map(r => r.sheet_name));
      result.errors.forEach(e => sheets.add(e.sheet_name));
      const expanded: Record<string, boolean> = {};
      sheets.forEach(s => { expanded[s] = true; });
      setExpandedSheets(expanded);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถอ่านไฟล์ได้");
    } finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!file || !selectedDepartment) return;
    setConfirming(true);
    try {
      const result = await importApi.confirm(file, selectedDepartment);
      toast.success(`นำเข้าสำเร็จ ${result.rows_success} แถว`);
      setPreview(null);
      setFile(null);
      setViewMode("history");
      fetchBatches();
    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาดในการนำเข้า";
      toast.error(errorMsg);
    } finally { setConfirming(false); }
  };

  const handleCancel = () => {
    setPreview(null);
    setFile(null);
    setViewMode("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getUserName = (userId: number) => usersMap[userId]?.name ?? `User #${userId}`;

  // Helper functions for preview analysis
  const getSheetStats = (preview: ImportPreviewData) => {
    const stats: Record<string, { valid: number; errors: number; roles: string[] }> = {};
    
    preview.valid_rows.forEach(row => {
      if (!stats[row.sheet_name]) {
        stats[row.sheet_name] = { valid: 0, errors: 0, roles: [] };
      }
      stats[row.sheet_name].valid++;
      if (!stats[row.sheet_name].roles.includes(row.role_type)) {
        stats[row.sheet_name].roles.push(row.role_type);
      }
    });

    preview.errors.forEach(err => {
      if (!stats[err.sheet_name]) {
        stats[err.sheet_name] = { valid: 0, errors: 0, roles: [] };
      }
      stats[err.sheet_name].errors++;
    });

    return stats;
  };

  const getErrorsBySheet = (errors: ImportRowError[]) => {
    const grouped: Record<string, Record<number, ImportRowError[]>> = {};
    errors.forEach(err => {
      if (!grouped[err.sheet_name]) grouped[err.sheet_name] = {};
      if (!grouped[err.sheet_name][err.row_number]) grouped[err.sheet_name][err.row_number] = [];
      grouped[err.sheet_name][err.row_number].push(err);
    });
    return grouped;
  };

  const getRowContext = (sheet: string, rowNum: number, rows: ImportRowData[]) => {
    return rows.find(r => r.sheet_name === sheet && r.row_number === rowNum);
  };

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
          <div className="space-y-4">
            {/* Department Selector */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <label className="text-sm font-semibold text-blue-900 block mb-2">
                เลือกแผนกสำหรับการนำเข้า
              </label>
              <select
                value={selectedDepartment || ""}
                onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- เลือกแผนก --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              {!selectedDepartment && (
                <p className="text-xs text-blue-700 mt-2">⚠️ ต้องเลือกแผนกก่อนทำการนำเข้า</p>
              )}
            </div>

            {/* File Upload */}
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
          </div>
        )}

        {viewMode === "preview" && preview && (
          <div className="space-y-6">
            {/* Summary Statistics */}
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

            {/* Sheet Mapping */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  ภาพรวมการนำเข้าต่อชีต
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {Object.entries(getSheetStats(preview)).map(([sheetName, stats]) => (
                  <div key={sheetName} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{sheetName}</h4>
                        <p className="text-sm text-muted-foreground">{stats.roles.join(" + ")} • {stats.valid + stats.errors} แถว</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">ถูกต้อง</p>
                          <p className="text-lg font-semibold text-emerald-400">{stats.valid}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">ข้อผิดพลาด</p>
                          <p className="text-lg font-semibold text-destructive">{stats.errors}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Valid Rows Preview Section */}
            {preview.valid_count > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ตัวอย่างแถวที่จะนำเข้า ({preview.valid_count} แถว)
                </h3>
                <div className="space-y-4">
                  {preview.valid_rows.slice(0, 10).map((row, idx) => {
                    const rowKey = `${row.sheet_name}-${row.row_number}`;
                    const controllerValue = rowControllerMapping[rowKey] !== undefined ? rowControllerMapping[rowKey] : row.controller_id;
                    const processorValue = rowProcessorMapping[rowKey] !== undefined ? rowProcessorMapping[rowKey] : row.processor_id;
                    
                    return (
                      <div key={idx} className="bg-white rounded p-4 border border-emerald-200 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">ชีต</span>
                            <p className="font-medium">{row.sheet_name}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">บทบาท</span>
                            <p className="font-medium">{row.role_type}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">กิจกรรม</span>
                            <p className="font-medium">{row.activity_name || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">วัตถุประสงค์</span>
                            <p className="font-medium text-sm">{row.purpose ? row.purpose.substring(0, 100) : "-"}</p>
                          </div>
                        </div>
                        
                        {/* Controller/Processor Selector */}
                        {row.role_type === "Controller" && (
                          <div className="border-t border-emerald-100 pt-3">
                            <label className="text-xs text-muted-foreground block mb-1">
                              เจ้าของข้อมูล: {row.controller_name || "(ไม่ระบุ)"}
                            </label>
                            <select
                              value={controllerValue || ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setRowControllerMapping(prev => ({ ...prev, [rowKey]: val }));
                              }}
                              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- เลือก/ตรวจสอบเจ้าของข้อมูล --</option>
                              {preview.controller_options.filter(c => c.is_active).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="NEW">+ สร้างเจ้าของข้อมูลใหม่</option>
                            </select>
                          </div>
                        )}
                        
                        {row.role_type === "Processor" && (
                          <div className="border-t border-emerald-100 pt-3">
                            <label className="text-xs text-muted-foreground block mb-1">
                              ผู้ประมวลผล: {row.processor_name || "(ไม่ระบุ)"}
                            </label>
                            <select
                              value={processorValue || ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setRowProcessorMapping(prev => ({ ...prev, [rowKey]: val }));
                              }}
                              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- เลือก/ตรวจสอบผู้ประมวลผล --</option>
                              {preview.processor_options.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                              <option value="NEW">+ สร้างผู้ประมวลผลใหม่</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {preview.valid_count > 10 && (
                    <p className="text-xs text-muted-foreground text-center bg-white rounded p-2">... และอีก {preview.valid_count - 10} แถว</p>
                  )}
                </div>
              </div>
            )}

            {/* Error Details by Sheet */}
            {preview.errors.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">รายละเอียดข้อผิดพลาด ({preview.error_count} รายการ)</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(getErrorsBySheet(preview.errors)).map(([sheetName, rowErrors]) => (
                    <div key={sheetName} className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                      <button
                        onClick={() => setExpandedSheets(prev => ({ ...prev, [sheetName]: !prev[sheetName] }))}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedSheets[sheetName] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                          <span className="font-medium text-amber-900">ชีต "{sheetName}"</span>
                          <span className="ml-2 inline-block px-2 py-1 rounded-full bg-amber-200 text-xs font-semibold text-amber-900">
                            {Object.keys(rowErrors).length} แถวที่มีข้อผิดพลาด
                          </span>
                        </div>
                      </button>

                      {expandedSheets[sheetName] && (
                        <div className="border-t border-amber-200 divide-y divide-amber-200">
                          {Object.entries(rowErrors).map(([rowNum, errors]) => {
                            const rowContext = getRowContext(sheetName, parseInt(rowNum), preview.valid_rows);
                            const activityName = rowContext?.activity_name || "(ไม่มีชื่อกิจกรรม)";
                            const rowKey = `${sheetName}-${rowNum}`;
                            return (
                              <div key={rowKey} className="px-6 py-3 bg-white">
                                <button
                                  onClick={() => setExpandedRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                  className="w-full flex items-start justify-between hover:bg-amber-50 p-2 rounded -mx-2 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {expandedRows[rowKey] ? <ChevronDown className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                                      <span className="text-sm font-medium text-foreground">แถวที่ {rowNum}</span>
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{errors.length} ปัญหา</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-6">{activityName}</p>
                                  </div>
                                </button>

                                {expandedRows[rowKey] && (
                                  <div className="ml-6 mt-3 pt-3 border-t border-slate-200 space-y-2">
                                    {errors.map((err, idx) => (
                                      <div key={idx} className="text-sm">
                                        <div className="flex items-start gap-2">
                                          <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-primary">{err.field_name}</p>
                                            <p className="text-xs text-destructive mt-1">{err.error_reason}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Rows Preview */}
            {preview.valid_count > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ตัวอย่างแถวที่จะนำเข้า ({preview.valid_count} แถว)
                </h3>
                <div className="space-y-4">
                  {preview.valid_rows.slice(0, 10).map((row, idx) => {
                    const rowKey = `${row.sheet_name}-${row.row_number}`;
                    const controllerValue = rowControllerMapping[rowKey] !== undefined ? rowControllerMapping[rowKey] : row.controller_id;
                    const processorValue = rowProcessorMapping[rowKey] !== undefined ? rowProcessorMapping[rowKey] : row.processor_id;
                    
                    return (
                      <div key={idx} className="bg-white rounded p-4 border border-emerald-200 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">ชีต</span>
                            <p className="font-medium">{row.sheet_name}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">บทบาท</span>
                            <p className="font-medium">{row.role_type}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">กิจกรรม</span>
                            <p className="font-medium">{row.activity_name || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">วัตถุประสงค์</span>
                            <p className="font-medium text-sm">{row.purpose ? row.purpose.substring(0, 100) : "-"}</p>
                          </div>
                        </div>
                        
                        {/* Controller/Processor Selector */}
                        {row.role_type === "Controller" && (
                          <div className="border-t border-emerald-100 pt-3">
                            <label className="text-xs text-muted-foreground block mb-1">
                              เจ้าของข้อมูล: {row.controller_name || "(ไม่ระบุ)"}
                            </label>
                            <select
                              value={controllerValue || ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setRowControllerMapping(prev => ({ ...prev, [rowKey]: val }));
                              }}
                              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- เลือก/ตรวจสอบเจ้าของข้อมูล --</option>
                              {preview.controller_options.filter(c => c.is_active).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="NEW">+ สร้างเจ้าของข้อมูลใหม่</option>
                            </select>
                          </div>
                        )}
                        
                        {row.role_type === "Processor" && (
                          <div className="border-t border-emerald-100 pt-3">
                            <label className="text-xs text-muted-foreground block mb-1">
                              ผู้ประมวลผล: {row.processor_name || "(ไม่ระบุ)"}
                            </label>
                            <select
                              value={processorValue || ""}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null;
                                setRowProcessorMapping(prev => ({ ...prev, [rowKey]: val }));
                              }}
                              className="w-full px-2 py-1.5 border border-blue-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- เลือก/ตรวจสอบผู้ประมวลผล --</option>
                              {preview.processor_options.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                              <option value="NEW">+ สร้างผู้ประมวลผลใหม่</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {preview.valid_count > 10 && (
                    <p className="text-xs text-muted-foreground text-center bg-white rounded p-2">... และอีก {preview.valid_count - 10} แถว</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={handleCancel} className="rounded-lg">ยกเลิก</Button>
              <Button onClick={handleConfirm} disabled={confirming || preview.valid_count === 0} className="rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700">
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
