"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, ClipboardList, BarChart3, Download, Scale, Baby, Globe, HardDrive, Users, Lock } from "lucide-react";
import { type ImportRowData } from "@/lib/api";

interface ImportPreviewDetailModalProps {
  isOpen: boolean;
  row: ImportRowData | null;
  onClose: () => void;
}

export function ImportPreviewDetailModal({
  isOpen,
  row,
  onClose,
}: ImportPreviewDetailModalProps) {
  if (!row) return null;

  const Section = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) => (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );

  const Field = ({
    label,
    value,
    fullWidth = false,
  }: {
    label: string;
    value: unknown;
    fullWidth?: boolean;
  }) => {
    if (!value && value !== false) return null;

    const displayValue =
      typeof value === "boolean" ? (value ? "ใช่" : "ไม่ใช่") : String(value);

    return (
      <div
        className={`rounded-lg border bg-background p-3 ${
          fullWidth ? "md:col-span-2" : ""
        }`}
      >
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground whitespace-pre-wrap break-words leading-6">
          {displayValue}
        </p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            ตรวจสอบข้อมูลแถวที่ {row.row_number} - {row.sheet_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto pr-2 max-h-[calc(90vh-140px)]">
          <Section title="ข้อมูลพื้นฐาน" icon={Building2}>
            <Field label="บทบาท" value={row.role_type} />
            <Field
              label="ชื่อผู้ประมวลผล/ควบคุม"
              value={row.controller_name || row.processor_name}
            />
            <Field
              label="ที่อยู่"
              value={row.excel_address || row.controller_address || row.processor_address}
              fullWidth
            />
            <Field label="อีเมล" value={row.controller_email || row.processor_email} />
            <Field label="เบอร์โทร" value={row.controller_phone || row.processor_phone} />
          </Section>

          <Section title="กิจกรรมและวัตถุประสงค์" icon={ClipboardList}>
            <Field label="ชื่อกิจกรรม" value={row.activity_name} />
            <Field label="ระดับความเสี่ยง" value={row.risk_level} />
            <Field label="วัตถุประสงค์" value={row.purpose} fullWidth />
          </Section>

          <Section title="หมวดหมู่ข้อมูล" icon={BarChart3}>
            <Field label="ข้อมูลส่วนบุคคล" value={row.excel_personal_data_types} fullWidth />
            <Field label="หมวดหมู่เจ้าของข้อมูล" value={row.excel_data_subject_categories} fullWidth />
            <Field label="ประเภทของข้อมูล" value={row.excel_data_type_general} />
          </Section>

          <Section title="แหล่งที่มาของข้อมูล" icon={Download}>
            <Field label="วิธีการได้มา" value={row.data_acquisition_method} />
            <Field label="จากเจ้าของข้อมูลโดยตรง" value={row.data_source_direct} />
            <Field label="จากแหล่งอื่น" value={row.data_source_other} fullWidth />
          </Section>

          <Section title="ฐานในการประมวลผล" icon={Scale}>
            <Field label="ฐาน (ไทย)" value={row.legal_basis_thai} fullWidth />
            <Field label="ฐาน (GDPR)" value={row.legal_basis_gdpr} fullWidth />
          </Section>
          
          <Section title="การขอความยินยอมของผู้เยาว์" icon={Baby}>
            <Field label="อายุต่ำกว่า 10 ปี" value={row.minor_consent_under_10} />
            <Field label="อายุ 10 - 20 ปี" value={row.minor_consent_10_20} />
          </Section>
          <Section title="การโอนข้อมูลข้ามพรมแดน" icon={Globe}>
            <Field label="มีการโอนข้อมูล" value={row.cross_border_transfer} />
            <Field label="เป็นกลุ่มบริษัท" value={row.cross_border_affiliate} />
            <Field label="วิธีการโอน" value={row.cross_border_method} fullWidth />
            <Field label="มาตรฐานการคุ้มครอง" value={row.cross_border_standard} fullWidth />
            <Field label="ข้อยกเว้นมาตรา 28" value={row.cross_border_exception} fullWidth />
          </Section>

          <Section title="การเก็บและจัดการข้อมูล" icon={HardDrive}>
            <Field label="ระยะเวลาการเก็บ" value={row.retention_period} />
            <Field label="วิธีการเก็บ" value={row.storage_type} />
            <Field label="รายละเอียดการเก็บ" value={row.storage_method} fullWidth />
            <Field label="สิทธิ์การเข้าถึง" value={row.access_rights} fullWidth />
            <Field label="วิธีการลบข้อมูล" value={row.deletion_method} fullWidth />
          </Section>

          <Section title="การใช้และเปิดเผยข้อมูล" icon={Users}>
            <Field label="เจ้าของข้อมูล" value={row.data_owner} />
            <Field label="ผู้รับข้อมูลบุคคลที่สาม" value={row.third_party_recipients} fullWidth />
            <Field label="ข้อยกเว้นการเปิดเผย" value={row.disclosure_exemption} fullWidth />
            <Field label="สิทธิ์ในการปฏิเสธ" value={row.rights_refusal} fullWidth />
          </Section>

          <Section title="มาตรการรักษาความปลอดภัย" icon={Lock}>
            <Field label="มาตรการองค์กร" value={row.security_organizational} fullWidth />
            <Field label="มาตรการเทคนิค" value={row.security_technical} fullWidth />
            <Field label="มาตรการทางกายภาพ" value={row.security_physical} fullWidth />
            <Field label="ควบคุมการเข้าถึง" value={row.security_access_control} fullWidth />
            <Field label="ความรับผิดชอบ" value={row.security_responsibility} fullWidth />
            <Field label="การตรวจสอบ" value={row.security_audit} fullWidth />
          </Section>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}