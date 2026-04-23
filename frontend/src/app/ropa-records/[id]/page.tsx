"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { RopaForm, EMPTY_FORM, type RopaFormData } from "@/components/ropa/ropa-form";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, History, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ropaRecordsApi, ApiError, type RopaRecordDetail } from "@/lib/api";

export default function RopaRecordDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const recordId = Number(params.id);
  const startEditing = searchParams.get("edit") === "true";

  const [record, setRecord] = useState<RopaRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(startEditing);
  const [form, setForm] = useState<RopaFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = user?.role !== "Viewer_Auditor";

  const loadRecord = useCallback(async () => {
    try {
      const data = await ropaRecordsApi.get(recordId);
      setRecord(data);
      setForm({
        department_id: String(data.department_id),
        role_type: data.role_type,
        controller_id: data.controller_id ? String(data.controller_id) : "",
        processor_id: data.processor_id ? String(data.processor_id) : "",
        data_subject_category_ids: data.data_subjects.map((d) => d.id),
        personal_data_type_ids: data.personal_data_types.map((p) => p.id),
        activity_name: data.activity_name ?? "",
        purpose: data.purpose ?? "",
        risk_level: data.risk_level ?? "",
        data_acquisition_method: data.data_acquisition_method ?? "",
        data_source_direct: data.data_source_direct ?? "",
        data_source_other: data.data_source_other ?? "",
        legal_basis_thai: data.legal_basis_thai ?? "",
        minor_consent_under_10: data.minor_consent_under_10 ?? "",
        minor_consent_10_20: data.minor_consent_10_20 ?? "",
        cross_border_transfer: data.cross_border_transfer === null ? "" : String(data.cross_border_transfer),
        cross_border_affiliate: data.cross_border_affiliate ?? "",
        cross_border_method: data.cross_border_method ?? "",
        cross_border_standard: data.cross_border_standard ?? "",
        cross_border_exception: data.cross_border_exception ?? "",
        retention_period: data.retention_period ?? "",
        retention_expiry_date: data.retention_expiry_date ?? "",
        next_review_date: data.next_review_date ?? "",
        storage_type: data.storage_type ?? "",
        storage_method: data.storage_method ?? "",
        access_rights: data.access_rights ?? "",
        deletion_method: data.deletion_method ?? "",
        data_owner: data.data_owner ?? "",
        third_party_recipients: data.third_party_recipients ?? "",
        disclosure_exemption: data.disclosure_exemption ?? "",
        rights_refusal: data.rights_refusal ?? "",
        security_organizational: data.security_organizational ?? "",
        security_technical: data.security_technical ?? "",
        security_physical: data.security_physical ?? "",
        security_access_control: data.security_access_control ?? "",
        security_responsibility: data.security_responsibility ?? "",
        security_audit: data.security_audit ?? "",
        reason: "",
        rejection_reason: data.rejection_reason ?? "",
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => { loadRecord(); }, [loadRecord]);

  const handleUpdate = async () => {
    if (!form.reason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการแก้ไข (ส่วนที่ 8)");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        role_type: form.role_type || undefined,
        controller_id: form.controller_id ? Number(form.controller_id) : undefined,
        processor_id: form.processor_id ? Number(form.processor_id) : undefined,
        data_subject_category_ids: form.data_subject_category_ids,
        personal_data_type_ids: form.personal_data_type_ids,
        process_name: undefined,
        activity_name: form.activity_name || undefined,
        purpose: form.purpose || undefined,
        risk_level: form.risk_level || undefined,
        data_acquisition_method: form.data_acquisition_method || undefined,
        data_source_direct: form.data_source_direct || undefined,
        data_source_other: form.data_source_other || undefined,
        legal_basis_thai: form.legal_basis_thai || undefined,
        minor_consent_under_10: form.minor_consent_under_10 || undefined,
        minor_consent_10_20: form.minor_consent_10_20 || undefined,
        cross_border_transfer: form.cross_border_transfer ? form.cross_border_transfer === "true" : undefined,
        cross_border_affiliate: form.cross_border_affiliate || undefined,
        cross_border_method: form.cross_border_method || undefined,
        cross_border_standard: form.cross_border_standard || undefined,
        cross_border_exception: form.cross_border_exception || undefined,
        retention_period: form.retention_period || undefined,
        retention_expiry_date: form.retention_expiry_date || undefined,
        next_review_date: form.next_review_date || undefined,
        storage_type: form.storage_type || undefined,
        storage_method: form.storage_method || undefined,
        access_rights: form.access_rights || undefined,
        deletion_method: form.deletion_method || undefined,
        data_owner: form.data_owner || undefined,
        third_party_recipients: form.third_party_recipients || undefined,
        disclosure_exemption: form.disclosure_exemption || undefined,
        rights_refusal: form.rights_refusal || undefined,
        security_organizational: form.security_organizational || undefined,
        security_technical: form.security_technical || undefined,
        security_physical: form.security_physical || undefined,
        security_access_control: form.security_access_control || undefined,
        security_responsibility: form.security_responsibility || undefined,
        security_audit: form.security_audit || undefined,
        reason: form.reason,
      };
      await ropaRecordsApi.update(recordId, payload);
      toast.success("แก้ไข ROPA Record สำเร็จ");
      setIsEditing(false);
      loadRecord();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="ROPA Record" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  if (!record) {
    return (
      <DashboardLayout>
        <Header title="ROPA Record" />
        <div className="p-6 text-center text-muted-foreground">ไม่พบข้อมูล</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title={isEditing ? "แก้ไข ROPA Record" : `ROPA Record #${record.id}`}
        description={record.activity_name || undefined}
        actions={
          !isEditing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-lg gap-1.5" onClick={() => router.push(`/ropa-records/${recordId}/versions`)}>
                <History className="h-4 w-4" />ประวัติเวอร์ชัน
              </Button>
              {canEdit && !record.is_deleted && (
                <Button onClick={() => setIsEditing(true)} className="rounded-lg gap-1.5">
                  <Pencil className="h-4 w-4" />แก้ไข
                </Button>
              )}
            </div>
          )
        }
      />
      <div className="p-6 max-w-4xl">
        {record.rejection_reason && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/20 p-4">
            <p className="text-sm font-semibold text-red-400 mb-2"><AlertTriangle className="h-4 w-4 inline-block mr-1.5 -mt-0.5 text-red-400" />เหตุผลการปฏิเสธ</p>
            <p className="text-sm text-red-200">{record.rejection_reason}</p>
            {record.rejected_by && record.rejected_at && (
              <p className="text-xs text-red-300/70 mt-2">
                ปฏิเสธโดย {record.rejected_by.name} เมื่อ {new Date(record.rejected_at).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} {new Date(record.rejected_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.
              </p>
            )}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <RopaForm
            form={form}
            setForm={setForm}
            isEdit={isEditing}
            readOnly={!isEditing}
            isSubmitting={isSubmitting}
            userRole={user?.role}
            userDepartmentId={user?.department_id ?? null}
            recordStatus={record?.status}
            onSubmit={handleUpdate}
            onCancel={() => { setIsEditing(false); loadRecord(); }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
