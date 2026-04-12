"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2, ArrowLeft, AlertTriangle, Clock, Eye } from "lucide-react";
import { ropaRecordsApi, ApiError, type RetentionAlertData, type RetentionAlertItem } from "@/lib/api";

const URGENCY_CONFIG: Record<string, { label: string; variant: "danger" | "warning" | "info" | "default"; icon: string }> = {
  overdue: { label: "เกินกำหนด", variant: "danger", icon: "🔴" },
  within_30: { label: "ภายใน 30 วัน", variant: "warning", icon: "🟠" },
  within_60_90: { label: "ภายใน 60-90 วัน", variant: "info", icon: "🟡" },
  review_overdue: { label: "เกินกำหนดทบทวน", variant: "danger", icon: "🔴" },
};

function AlertSection({ title, items, variant, icon, onView }: {
  title: string; items: RetentionAlertItem[]; variant: "danger" | "warning" | "info" | "default"; icon: string;
  onView: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <StatusBadge variant={variant}>{items.length} รายการ</StatusBadge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.08] bg-[#0f172a]/80 hover:bg-white/[0.03] transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{item.activity_name || `Record #${item.id}`}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.department_name}
                {item.retention_expiry_date && ` • หมดอายุ: ${new Date(item.retention_expiry_date).toLocaleDateString("th-TH")}`}
                {item.next_review_date && ` • ทบทวน: ${new Date(item.next_review_date).toLocaleDateString("th-TH")}`}
              </p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={() => onView(item.id)} title="ดูรายละเอียด">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RetentionAlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<RetentionAlertData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await ropaRecordsApi.getRetentionAlerts();
      setAlerts(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดการแจ้งเตือนได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const totalAlerts = alerts
    ? alerts.overdue.length + alerts.within_30.length + alerts.within_60_90.length + alerts.review_overdue.length
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="การแจ้งเตือนการเก็บรักษาข้อมูล" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="การแจ้งเตือนการเก็บรักษาข้อมูล"
        description={`${totalAlerts} รายการที่ต้องดำเนินการ`}
        actions={
          <Button variant="outline" onClick={() => router.push("/ropa-records")} className="rounded-lg gap-1.5">
            <ArrowLeft className="h-4 w-4" />กลับ
          </Button>
        }
      />
      <div className="p-6 max-w-4xl space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {(["overdue", "within_30", "within_60_90", "review_overdue"] as const).map((key) => {
            const cfg = URGENCY_CONFIG[key];
            const count = alerts?.[key]?.length ?? 0;
            return (
              <div key={key} className="rounded-xl border border-white/[0.08] bg-[#0f172a]/80 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground mt-1">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {totalAlerts === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>ไม่มีการแจ้งเตือนในขณะนี้</p>
          </div>
        )}

        {alerts && (
          <>
            <AlertSection title="เกินกำหนดการเก็บรักษา" items={alerts.overdue} variant="danger" icon="🔴"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="เกินกำหนดทบทวน" items={alerts.review_overdue} variant="danger" icon="🔴"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="หมดอายุภายใน 30 วัน" items={alerts.within_30} variant="warning" icon="🟠"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="หมดอายุภายใน 60-90 วัน" items={alerts.within_60_90} variant="info" icon="🟡"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
