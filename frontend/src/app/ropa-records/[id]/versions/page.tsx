"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2, ArrowLeft, GitCompare, Clock } from "lucide-react";
import {
  ropaRecordsApi, ApiError,
  type RecordVersionData, type VersionCompareData,
} from "@/lib/api";

export default function VersionHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = Number(params.id);

  const [versions, setVersions] = useState<RecordVersionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparison, setComparison] = useState<VersionCompareData | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await ropaRecordsApi.listVersions(recordId, { per_page: 100 });
      setVersions(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดประวัติเวอร์ชันได้");
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const toggleSelect = (versionId: number) => {
    setSelected((prev) => {
      if (prev.includes(versionId)) return prev.filter((id) => id !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selected.length !== 2) { toast.error("กรุณาเลือก 2 เวอร์ชันเพื่อเปรียบเทียบ"); return; }
    setComparing(true);
    try {
      const res = await ropaRecordsApi.compareVersions(recordId, selected[0], selected[1]);
      setComparison(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถเปรียบเทียบได้");
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="ประวัติเวอร์ชัน" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title={`ประวัติเวอร์ชัน — Record #${recordId}`}
        description="ดูและเปรียบเทียบเวอร์ชันของ ROPA Record"
        actions={
          <div className="flex items-center gap-2">
            {selected.length === 2 && (
              <Button onClick={handleCompare} disabled={comparing} className="rounded-lg gap-1.5">
                {comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                เปรียบเทียบ
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push(`/ropa-records/${recordId}`)} className="rounded-lg gap-1.5">
              <ArrowLeft className="h-4 w-4" />กลับ
            </Button>
          </div>
        }
      />
      <div className="p-6 max-w-4xl space-y-6">
        {/* Version Timeline */}
        <div className="space-y-3">
          {versions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">ไม่มีประวัติเวอร์ชัน</p>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              onClick={() => toggleSelect(v.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                selected.includes(v.id)
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">เวอร์ชัน {v.version_number}</span>
                  {selected.includes(v.id) && <StatusBadge variant="info">เลือกแล้ว</StatusBadge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  โดย {v.changer.name} • {new Date(v.created_at).toLocaleString("th-TH")}
                </p>
                {v.change_reason && (
                  <p className="text-xs text-slate-500 mt-1">เหตุผล: {v.change_reason}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Result */}
        {comparison && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              เปรียบเทียบ: เวอร์ชัน {comparison.version_1.version_number} ↔ เวอร์ชัน {comparison.version_2.version_number}
            </h3>
            {comparison.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีการเปลี่ยนแปลง</p>
            ) : (
              <div className="space-y-2">
                {comparison.changes.map((c, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] p-3">
                    <p className="text-xs font-medium text-slate-400 mb-1">{c.field}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md bg-red-500/5 border border-red-500/10 p-2">
                        <p className="text-[10px] text-red-400 mb-0.5">เดิม</p>
                        <p className="text-xs text-slate-300">{c.old_value || "-"}</p>
                      </div>
                      <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 p-2">
                        <p className="text-[10px] text-emerald-400 mb-0.5">ใหม่</p>
                        <p className="text-xs text-slate-300">{c.new_value || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
