"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2, FileText, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  dashboardApi,
  ApiError,
  type DashboardSummary,
  type DashboardTrends,
  type DashboardStatusOverview,
  type DashboardComplianceScores,
  type DashboardSensitiveDataMapping,
  type DashboardRetentionAlertsSummary,
} from "@/lib/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

const CHART_COLORS = [
  "rgba(59,130,246,0.7)", "rgba(16,185,129,0.7)", "rgba(245,158,11,0.7)",
  "rgba(239,68,68,0.7)", "rgba(139,92,246,0.7)", "rgba(236,72,153,0.7)",
  "rgba(20,184,166,0.7)", "rgba(249,115,22,0.7)",
];
const CHART_BORDERS = CHART_COLORS.map((c) => c.replace("0.7", "1"));

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกปฏิเสธ",
  pending_edit_approval: "รออนุมัติแก้ไข",
  pending_delete_approval: "รออนุมัติลบ",
};

const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#94a3b8", font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
    y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
  },
};

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom" as const, labels: { color: "#94a3b8", font: { size: 11 }, padding: 12 } },
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [statusOverview, setStatusOverview] = useState<DashboardStatusOverview | null>(null);
  const [compliance, setCompliance] = useState<DashboardComplianceScores | null>(null);
  const [sensitiveMap, setSensitiveMap] = useState<DashboardSensitiveDataMapping | null>(null);
  const [retention, setRetention] = useState<DashboardRetentionAlertsSummary | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sum, tr, st, comp, sens, ret] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.trends(),
        dashboardApi.statusOverview(),
        dashboardApi.complianceScores(),
        dashboardApi.sensitiveDataMapping(),
        dashboardApi.retentionAlerts(),
      ]);
      setSummary(sum);
      setTrends(tr);
      setStatusOverview(st);
      setCompliance(comp);
      setSensitiveMap(sens);
      setRetention(ret);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!user) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="แดชบอร์ด" description="ภาพรวมการจัดการ ROPA ขององค์กร" />
        <div className="flex items-center justify-center p-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalAlerts = retention ? retention.overdue + retention.within_30 + retention.within_60_90 + retention.review_overdue : 0;

  return (
    <DashboardLayout>
      <Header title="แดชบอร์ด" description="ภาพรวมการจัดการ ROPA ขององค์กร" />
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={<FileText className="h-5 w-5 text-blue-400" />} label="ROPA ทั้งหมด" value={summary?.total ?? 0} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />} label="อนุมัติแล้ว" value={statusOverview?.statuses?.approved ?? 0} />
          <SummaryCard icon={<Clock className="h-5 w-5 text-amber-400" />} label="รออนุมัติ" value={(statusOverview?.statuses?.pending_approval ?? 0) + (statusOverview?.statuses?.pending_edit_approval ?? 0) + (statusOverview?.statuses?.pending_delete_approval ?? 0)} />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-red-400" />} label="การแจ้งเตือน" value={totalAlerts} variant={totalAlerts > 0 ? "danger" : "default"} />
        </div>

        {/* Status Overview */}
        {statusOverview && Object.keys(statusOverview.statuses).length > 0 && (
          <Card>
            <CardHeader><CardTitle>สถานะ ROPA</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(statusOverview.statuses).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                    <StatusBadge variant={status === "approved" ? "success" : status === "rejected" ? "danger" : "warning"} dot>
                      {STATUS_LABELS[status] ?? status}
                    </StatusBadge>
                    <span className="text-sm font-semibold text-slate-200">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row 1: Department Distribution + Risk Level */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary && summary.by_department.length > 0 && (
            <Card>
              <CardHeader><CardTitle>จำนวน ROPA ตามแผนก</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: summary.by_department.map((d) => d.department),
                      datasets: [{ label: "จำนวน", data: summary.by_department.map((d) => d.count), backgroundColor: CHART_COLORS, borderColor: CHART_BORDERS, borderWidth: 1 }],
                    }}
                    options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {summary && summary.by_risk_level.length > 0 && (
            <Card>
              <CardHeader><CardTitle>ระดับความเสี่ยง</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie
                    data={{
                      labels: summary.by_risk_level.map((r) => r.risk_level),
                      datasets: [{ data: summary.by_risk_level.map((r) => r.count), backgroundColor: CHART_COLORS, borderColor: "rgba(15,23,42,0.8)", borderWidth: 2 }],
                    }}
                    options={pieOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Row 2: Legal Basis + Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary && summary.by_legal_basis.length > 0 && (
            <Card>
              <CardHeader><CardTitle>ฐานทางกฎหมาย</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: summary.by_legal_basis.map((l) => l.legal_basis.length > 20 ? l.legal_basis.slice(0, 20) + "…" : l.legal_basis),
                      datasets: [{ label: "จำนวน", data: summary.by_legal_basis.map((l) => l.count), backgroundColor: "rgba(139,92,246,0.7)", borderColor: "rgba(139,92,246,1)", borderWidth: 1 }],
                    }}
                    options={{ ...chartOptions, indexAxis: "y" as const, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {trends && trends.monthly_trends.length > 0 && (
            <Card>
              <CardHeader><CardTitle>แนวโน้มรายเดือน</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line
                    data={{
                      labels: trends.monthly_trends.map((t) => `${MONTH_NAMES[t.month - 1]} ${t.year + 543}`),
                      datasets: [{ label: "สร้างใหม่", data: trends.monthly_trends.map((t) => t.count), borderColor: "rgba(59,130,246,1)", backgroundColor: "rgba(59,130,246,0.15)", fill: true, tension: 0.3 }],
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sensitive Data Mapping */}
        {sensitiveMap && sensitiveMap.mapping.length > 0 && (
          <Card>
            <CardHeader><CardTitle>แผนกที่มีข้อมูลอ่อนไหวมากที่สุด</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar
                  data={{
                    labels: sensitiveMap.mapping.map((m) => m.department),
                    datasets: [{ label: "จำนวนข้อมูลอ่อนไหว", data: sensitiveMap.mapping.map((m) => m.sensitive_data_count), backgroundColor: "rgba(236,72,153,0.7)", borderColor: "rgba(236,72,153,1)", borderWidth: 1 }],
                  }}
                  options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Scores */}
        {compliance && compliance.scores.length > 0 && (
          <Card>
            <CardHeader><CardTitle>คะแนนความสอดคล้อง (Compliance) ตามแผนก</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {compliance.scores.map((s) => (
                  <div key={s.department_id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-200">{s.department}</span>
                      <span className="text-sm font-bold text-slate-200">{s.compliance_score}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(s.compliance_score, 100)}%`,
                          backgroundColor: s.compliance_score >= 80 ? "rgb(16,185,129)" : s.compliance_score >= 50 ? "rgb(245,158,11)" : "rgb(239,68,68)",
                        }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[11px] text-slate-400">
                      <span>ความครบถ้วน {s.completeness_pct}%</span>
                      <span>ฐานกฎหมาย {s.legal_basis_coverage_pct}%</span>
                      <span>{s.record_count} รายการ</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retention Alerts Summary */}
        {retention && totalAlerts > 0 && (
          <Card>
            <CardHeader><CardTitle>สรุปการแจ้งเตือนการเก็บรักษาข้อมูล</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AlertBadge label="เกินกำหนด" count={retention.overdue} variant="danger" />
                <AlertBadge label="ภายใน 30 วัน" count={retention.within_30} variant="warning" />
                <AlertBadge label="ภายใน 60-90 วัน" count={retention.within_60_90} variant="info" />
                <AlertBadge label="เกินกำหนดทบทวน" count={retention.review_overdue} variant="danger" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number; variant?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-1">
        <div className="rounded-lg bg-white/[0.05] p-2.5">{icon}</div>
        <div>
          <p className={`text-2xl font-bold ${variant === "danger" && value > 0 ? "text-red-400" : "text-slate-100"}`}>{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertBadge({ label, count, variant }: { label: string; count: number; variant: "danger" | "warning" | "info" }) {
  const colors = { danger: "text-red-400 bg-red-500/10 ring-red-500/20", warning: "text-amber-400 bg-amber-500/10 ring-amber-500/20", info: "text-blue-400 bg-blue-500/10 ring-blue-500/20" };
  return (
    <div className={`rounded-xl ring-1 p-4 text-center ${colors[variant]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}
