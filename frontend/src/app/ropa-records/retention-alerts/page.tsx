"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2, ArrowLeft, AlertTriangle, Clock, Eye, CircleAlert, CircleDot } from "lucide-react";
import { ropaRecordsApi, ApiError, type RetentionAlertData, type RetentionAlertItem } from "@/lib/api";

const URGENCY_ICON_MAP: Record<string, { className: string; Icon: typeof CircleAlert }> = {
  danger: { className: "h-4 w-4 text-red-500", Icon: CircleAlert },
  warning: { className: "h-4 w-4 text-orange-500", Icon: CircleDot },
  info: { className: "h-4 w-4 text-yellow-500", Icon: CircleDot },
};

const URGENCY_CONFIG: Record<string, { label: string; variant: "danger" | "warning" | "info" | "default" }> = {
  overdue: { label: "เกินกำหนด", variant: "danger" },
  within_30: { label: "ภายใน 30 วัน", variant: "warning" },
  within_60_90: { label: "ภายใน 31-90 วัน", variant: "info" },
  review_overdue: { label: "เกินกำหนดทบทวน", variant: "danger" },
};

function AlertSection({ title, items = [], variant, onView }: {
  title: string; items?: RetentionAlertItem[]; variant: "danger" | "warning" | "info" | "default";
  onView: (id: number) => void;
}) {
  if (!items || items.length === 0) return null;
  const iconCfg = URGENCY_ICON_MAP[variant] ?? URGENCY_ICON_MAP.info;
  const IconComponent = iconCfg.Icon;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <IconComponent className={iconCfg.className} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <StatusBadge variant={variant}>{items.length} รายการ</StatusBadge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
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
    ? (alerts.overdue?.length ?? 0) + (alerts.within_30?.length ?? 0) + (alerts.within_60_90?.length ?? 0) + (alerts.review_overdue?.length ?? 0)
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
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
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
            <AlertSection title="เกินกำหนดการเก็บรักษา" items={alerts.overdue} variant="danger"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="เกินกำหนดทบทวน" items={alerts.review_overdue} variant="danger"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="หมดอายุภายใน 30 วัน" items={alerts.within_30} variant="warning"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
            <AlertSection title="หมดอายุภายใน 31-90 วัน" items={alerts.within_60_90} variant="info"
              onView={(id) => router.push(`/ropa-records/${id}`)} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
