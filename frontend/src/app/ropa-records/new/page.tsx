"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { RopaForm, EMPTY_FORM, type RopaFormData } from "@/components/ropa/ropa-form";
import { ropaRecordsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function NewRopaRecordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<RopaFormData>({
    ...EMPTY_FORM,
    department_id: user?.department_id?.toString() ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.department_id || !form.role_type) {
      toast.error("กรุณาเลือกแผนกและประเภท");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        department_id: Number(form.department_id),
        role_type: form.role_type,
        controller_id: form.controller_id ? Number(form.controller_id) : undefined,
        processor_id: form.processor_id ? Number(form.processor_id) : undefined,
        data_subject_category_ids: form.data_subject_category_ids,
        personal_data_type_ids: form.personal_data_type_ids,
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
        reason: form.reason || undefined,
      };
      await ropaRecordsApi.create(payload);
      toast.success("สร้าง ROPA Record สำเร็จ");
      router.push("/ropa-records");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Header title="สร้าง ROPA Record ใหม่" description="กรอกข้อมูลทั้ง 8 ส่วนเพื่อสร้าง Record of Processing Activities" />
      <div className="p-6 max-w-4xl">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <RopaForm form={form} setForm={setForm} isSubmitting={isSubmitting} userRole={user?.role} userDepartmentId={user?.department_id ?? null} onSubmit={handleSubmit} onCancel={() => router.push("/ropa-records")} />
        </div>
      </div>
    </DashboardLayout>
  );
}
