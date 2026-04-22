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
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Muted professional palette — red/rose/warm tones
const CHART_PALETTE = [
  { bg: "rgba(220,38,38,0.15)", border: "rgba(220,38,38,0.8)" },
  { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.8)" },
  { bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.8)" },
  { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.8)" },
  { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.8)" },
  { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.8)" },
  { bg: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.8)" },
  { bg: "rgba(100,116,139,0.15)", border: "rgba(100,116,139,0.8)" },
];

// Solid fills for pie/doughnut
const DOUGHNUT_COLORS = [
  "rgba(220,38,38,0.75)", "rgba(249,115,22,0.75)", "rgba(234,179,8,0.75)",
  "rgba(16,185,129,0.75)", "rgba(59,130,246,0.75)", "rgba(139,92,246,0.75)",
];

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ถูกปฏิเสธ",
  pending_edit_approval: "รออนุมัติแก้ไข", pending_delete_approval: "รออนุมัติลบ",
};

const MONTH_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Light theme chart defaults
const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#e2e8f0",
      borderColor: "#334155",
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      titleFont: { size: 12, weight: "bold" as const },
      bodyFont: { size: 11 },
    },
  },
  scales: {
    x: {
      ticks: { color: "#64748b", font: { size: 11 } },
      grid: { color: "#f1f5f9", drawBorder: false },
      border: { display: false },
    },
    y: {
      ticks: { color: "#64748b", font: { size: 11 } },
      grid: { color: "#f1f5f9", drawBorder: false },
      border: { display: false },
    },
  },
};

const barOptions = {
  ...baseOptions,
  elements: { bar: { borderRadius: 6, borderSkipped: false as const } },
};

const horizontalBarOptions = {
  ...baseOptions,
  indexAxis: "y" as const,
  elements: { bar: { borderRadius: 6, borderSkipped: false as const } },
};

const lineOptions = {
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    legend: { display: true, position: "top" as const, align: "end" as const, labels: { color: "#64748b", font: { size: 11 }, boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle" as const } },
  },
  elements: { point: { radius: 4, hoverRadius: 6 }, line: { tension: 0.35 } },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "65%",
  plugins: {
    legend: {
      position: "right" as const,
      labels: { color: "#475569", font: { size: 11 }, padding: 16, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle" as const },
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor: "#f8fafc",
      bodyColor: "#e2e8f0",
      cornerRadius: 8,
      padding: 10,
    },
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
        dashboardApi.summary(), dashboardApi.trends(), dashboardApi.statusOverview(),
        dashboardApi.complianceScores(), dashboardApi.sensitiveDataMapping(), dashboardApi.retentionAlerts(),
      ]);
      setSummary(sum); setTrends(tr); setStatusOverview(st);
      setCompliance(comp); setSensitiveMap(sens); setRetention(ret);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!user) return null;
  if (loading) {
    return (
      <DashboardLayout>
        <Header title="แดชบอร์ด" description="ภาพรวมการจัดการ ROPA ขององค์กร" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>
      </DashboardLayout>
    );
  }

  const totalAlerts = retention ? retention.overdue + retention.within_30 + retention.within_60_90 + retention.review_overdue : 0;

  return (
    <DashboardLayout>
      <Header title="แดชบอร์ด" description="ภาพรวมการจัดการ ROPA ขององค์กร" />
      <div className="p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={<FileText className="h-5 w-5" />} iconBg="bg-blue-50 text-blue-600" label="ROPA ทั้งหมด" value={summary?.total ?? 0} />
          <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} iconBg="bg-emerald-50 text-emerald-600" label="อนุมัติแล้ว" value={statusOverview?.statuses?.approved ?? 0} />
          <SummaryCard icon={<Clock className="h-5 w-5" />} iconBg="bg-amber-50 text-amber-600" label="รออนุมัติ" value={(statusOverview?.statuses?.pending_approval ?? 0) + (statusOverview?.statuses?.pending_edit_approval ?? 0) + (statusOverview?.statuses?.pending_delete_approval ?? 0)} />
          <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} iconBg={totalAlerts > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"} label="การแจ้งเตือน" value={totalAlerts} />
        </div>

        {/* Status Overview */}
        {statusOverview && Object.keys(statusOverview.statuses).length > 0 && (
          <Card>
            <CardHeader><CardTitle>สถานะ ROPA Records</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(statusOverview.statuses).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5">
                    <StatusBadge variant={status === "approved" ? "success" : status === "rejected" ? "danger" : "warning"} dot>
                      {STATUS_LABELS[status] ?? status}
                    </StatusBadge>
                    <span className="text-sm font-bold text-slate-800">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary && summary.by_department.length > 0 && (
            <Card>
              <CardHeader><CardTitle>จำนวน ROPA ตามแผนก</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <Bar
                    data={{
                      labels: summary.by_department.map((d) => d.department),
                      datasets: [{
                        label: "จำนวน",
                        data: summary.by_department.map((d) => d.count),
                        backgroundColor: CHART_PALETTE.map((c) => c.bg),
                        borderColor: CHART_PALETTE.map((c) => c.border),
                        borderWidth: 1.5,
                      }],
                    }}
                    options={barOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {summary && summary.by_risk_level.length > 0 && (
            <Card>
              <CardHeader><CardTitle>ระดับความเสี่ยง</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72 flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: summary.by_risk_level.map((r) => r.risk_level),
                      datasets: [{
                        data: summary.by_risk_level.map((r) => r.count),
                        backgroundColor: DOUGHNUT_COLORS,
                        borderColor: "#ffffff",
                        borderWidth: 3,
                      }],
                    }}
                    options={doughnutOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary && summary.by_legal_basis.length > 0 && (
            <Card>
              <CardHeader><CardTitle>ฐานทางกฎหมาย</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <Bar
                    data={{
                      labels: summary.by_legal_basis.map((l) => l.legal_basis.length > 25 ? l.legal_basis.slice(0, 25) + "…" : l.legal_basis),
                      datasets: [{
                        label: "จำนวน",
                        data: summary.by_legal_basis.map((l) => l.count),
                        backgroundColor: "rgba(139,92,246,0.15)",
                        borderColor: "rgba(139,92,246,0.7)",
                        borderWidth: 1.5,
                      }],
                    }}
                    options={horizontalBarOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {trends && trends.monthly_trends.length > 0 && (
            <Card>
              <CardHeader><CardTitle>แนวโน้มรายเดือน</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <Line
                    data={{
                      labels: trends.monthly_trends.map((t) => `${MONTH_NAMES[t.month - 1]} ${t.year + 543}`),
                      datasets: [{
                        label: "สร้างใหม่",
                        data: trends.monthly_trends.map((t) => t.count),
                        borderColor: "rgba(220,38,38,0.8)",
                        backgroundColor: "rgba(220,38,38,0.06)",
                        fill: true,
                        pointBackgroundColor: "#ffffff",
                        pointBorderColor: "rgba(220,38,38,0.8)",
                        pointBorderWidth: 2,
                      }],
                    }}
                    options={lineOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sensitive Data */}
        {sensitiveMap && sensitiveMap.mapping.length > 0 && (
          <Card>
            <CardHeader><CardTitle>แผนกที่มีข้อมูลอ่อนไหวมากที่สุด</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar
                  data={{
                    labels: sensitiveMap.mapping.map((m) => m.department),
                    datasets: [{
                      label: "จำนวนข้อมูลอ่อนไหว",
                      data: sensitiveMap.mapping.map((m) => m.sensitive_data_count),
                      backgroundColor: "rgba(244,63,94,0.15)",
                      borderColor: "rgba(244,63,94,0.7)",
                      borderWidth: 1.5,
                    }],
                  }}
                  options={barOptions}
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
                  <div key={s.department_id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-medium text-slate-800">{s.department}</span>
                      <span className={`text-sm font-bold ${s.compliance_score >= 80 ? "text-emerald-600" : s.compliance_score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {s.compliance_score}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(s.compliance_score, 100)}%`,
                          backgroundColor: s.compliance_score >= 80 ? "#10b981" : s.compliance_score >= 50 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
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

        {/* Retention Alerts */}
        {retention && totalAlerts > 0 && (
          <Card>
            <CardHeader><CardTitle>สรุปการแจ้งเตือนการเก็บรักษาข้อมูล</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AlertCard label="เกินกำหนด" count={retention.overdue} color="red" />
                <AlertCard label="ภายใน 30 วัน" count={retention.within_30} color="amber" />
                <AlertCard label="ภายใน 31-90 วัน" count={retention.within_60_90} color="blue" />
                <AlertCard label="เกินกำหนดทบทวน" count={retention.review_overdue} color="red" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-1">
        <div className={`rounded-xl p-3 ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertCard({ label, count, color }: { label: string; count: number; color: "red" | "amber" | "blue" }) {
  const styles = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${styles[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1 opacity-70">{label}</p>
    </div>
  );
}
