"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Loader2, Sparkles, ClipboardList, Lightbulb } from "lucide-react";
import {
  departmentsApi, controllersApi, processorsApi, masterDataApi, suggestionsApi,
  ApiError,
  type DepartmentData, type ControllerData, type ProcessorData,
  type DataSubjectCategoryData, type PersonalDataTypeData,
  type RopaRecordCreatePayload, type SuggestionItem,
} from "@/lib/api";

export interface RopaFormData {
  department_id: string;
  role_type: string;
  controller_id: string;
  processor_id: string;
  data_subject_category_ids: number[];
  personal_data_type_ids: number[];
  activity_name: string;
  purpose: string;
  risk_level: string;
  data_acquisition_method: string;
  data_source_direct: string;
  data_source_other: string;
  legal_basis_thai: string;
  minor_consent_under_10: string;
  minor_consent_10_20: string;
  cross_border_transfer: string;
  cross_border_affiliate: string;
  cross_border_method: string;
  cross_border_standard: string;
  cross_border_exception: string;
  retention_period: string;
  retention_expiry_date: string;
  next_review_date: string;
  storage_type: string;
  storage_method: string;
  access_rights: string;
  deletion_method: string;
  data_owner: string;
  third_party_recipients: string;
  disclosure_exemption: string;
  rights_refusal: string;
  security_organizational: string;
  security_technical: string;
  security_physical: string;
  security_access_control: string;
  security_responsibility: string;
  security_audit: string;
  reason: string;
  rejection_reason?: string;
}

export const EMPTY_FORM: RopaFormData = {
  department_id: "", role_type: "Controller", controller_id: "", processor_id: "",
  data_subject_category_ids: [], personal_data_type_ids: [],
  activity_name: "", purpose: "", risk_level: "",
  data_acquisition_method: "", data_source_direct: "", data_source_other: "",
  legal_basis_thai: "", minor_consent_under_10: "", minor_consent_10_20: "",
  cross_border_transfer: "", cross_border_affiliate: "", cross_border_method: "", cross_border_standard: "", cross_border_exception: "",
  retention_period: "", retention_expiry_date: "", next_review_date: "",
  storage_type: "", storage_method: "", access_rights: "", deletion_method: "",
  data_owner: "", third_party_recipients: "", disclosure_exemption: "", rights_refusal: "",
  security_organizational: "", security_technical: "", security_physical: "",
  security_access_control: "", security_responsibility: "", security_audit: "",
  reason: "",
  rejection_reason: "",
};

interface RopaFormProps {
  form: RopaFormData;
  setForm: React.Dispatch<React.SetStateAction<RopaFormData>>;
  isEdit?: boolean;
  readOnly?: boolean;
  isSubmitting?: boolean;
  userRole?: string;
  userDepartmentId?: number | null;
  recordStatus?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

function TextArea({ id, label, value, onChange, placeholder, readOnly, rows = 3 }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        readOnly={readOnly} rows={rows}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y"
      />
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange, readOnly }: {
  label: string; options: { id: number; name: string }[]; selected: number[]; onChange: (ids: number[]) => void; readOnly?: boolean;
}) {
  const toggle = (id: number) => {
    if (readOnly) return;
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-input bg-background min-h-[40px]">
        {options.length === 0 && <span className="text-xs text-muted-foreground">ไม่มีข้อมูล</span>}
        {options.map((opt) => (
          <button key={opt.id} type="button" onClick={() => toggle(opt.id)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              selected.includes(opt.id)
                ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RopaForm({ form, setForm, isEdit, readOnly, isSubmitting, userRole, userDepartmentId, recordStatus, onSubmit, onCancel }: RopaFormProps) {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [controllers, setControllers] = useState<ControllerData[]>([]);
  const [processors, setProcessors] = useState<ProcessorData[]>([]);
  const [dataSubjects, setDataSubjects] = useState<DataSubjectCategoryData[]>([]);
  const [personalDataTypes, setPersonalDataTypes] = useState<PersonalDataTypeData[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [section, setSection] = useState(1);

  useEffect(() => {
    Promise.all([
      departmentsApi.list({ per_page: 100 }),
      controllersApi.list({ per_page: 100 }),
      processorsApi.list({ per_page: 100 }),
      masterDataApi.listDataSubjectCategories({ per_page: 100 }),
      masterDataApi.listPersonalDataTypes({ per_page: 100 }),
    ]).then(([depts, ctrls, procs, dsc, pdt]) => {
      setDepartments(depts.items);
      setControllers(ctrls.items);
      setProcessors(procs.items);
      setDataSubjects(dsc.items);
      setPersonalDataTypes(pdt.items);
    }).catch(() => toast.error("ไม่สามารถโหลดข้อมูลอ้างอิงได้"));
  }, []);

  const update = (field: keyof RopaFormData, value: string | number[] | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const getSuggestions = async () => {
    if (!form.activity_name && !form.purpose) { toast.error("กรุณากรอกชื่อกิจกรรมหรือวัตถุประสงค์ก่อน"); return; }
    setLoadingSuggestions(true);
    try {
      const res = await suggestionsApi.getLegalBasis({ activity_name: form.activity_name, purpose: form.purpose });
      setSuggestions(res.suggestions);
      if (res.fallback) toast.info("ไม่พบคำแนะนำที่ตรงกัน");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถขอคำแนะนำได้");
    } finally { setLoadingSuggestions(false); }
  };

  const applySuggestion = (s: SuggestionItem) => {
    update("legal_basis_thai", s.legal_basis);
    setSuggestions([]);
    toast.success(`เลือกฐานกฎหมาย: ${s.legal_basis}`);
  };

  const sections = [
    { num: 1, label: "กิจกรรมและวัตถุประสงค์" },
    { num: 2, label: "การได้มาซึ่งข้อมูล" },
    { num: 3, label: "ฐานกฎหมาย" },
    { num: 4, label: "การโอนข้อมูลข้ามแดน" },
    { num: 5, label: "การเก็บรักษาข้อมูล" },
    { num: 6, label: "เจ้าของข้อมูลและบุคคลที่สาม" },
    { num: 7, label: "มาตรการรักษาความปลอดภัย" },
    { num: 8, label: "ข้อมูลเพิ่มเติม" },
  ];

  return (
    <div className="space-y-6">
      {/* Rejection Alert Banner */}
      {form.rejection_reason && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-400"><ClipboardList className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />ได้รับการปฏิเสธ</p>
            <p className="text-sm text-red-300">{form.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <button key={s.num} type="button" onClick={() => setSection(s.num)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              section === s.num ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20" : "text-slate-500 hover:bg-slate-100"
            }`}>
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      {/* Section 1: Activity & Purpose */}
      {section === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department_id">แผนก *</Label>
              <select id="department_id" value={form.department_id} disabled={readOnly || isEdit || userRole === "Department_User"}
                onChange={(e) => update("department_id", e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">เลือกแผนก</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role_type">ประเภท *</Label>
              <select id="role_type" value={form.role_type} disabled={readOnly}
                onChange={(e) => update("role_type", e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="Controller">Controller</option>
                <option value="Processor">Processor</option>
              </select>
            </div>
          </div>
          {form.role_type === "Controller" ? (
            <div className="space-y-1.5">
              <Label htmlFor="controller_id">Controller</Label>
              <select id="controller_id" value={form.controller_id} disabled={readOnly}
                onChange={(e) => update("controller_id", e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">เลือก Controller</option>
                {controllers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="processor_id">Processor</Label>
              <select id="processor_id" value={form.processor_id} disabled={readOnly}
                onChange={(e) => update("processor_id", e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">เลือก Processor</option>
                {processors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="activity_name">ชื่อกิจกรรม</Label>
            <Input id="activity_name" value={form.activity_name} readOnly={readOnly}
              onChange={(e) => update("activity_name", e.target.value)} placeholder="ชื่อกิจกรรม" className="h-10 rounded-lg" />
          </div>
          <TextArea id="purpose" label="วัตถุประสงค์" value={form.purpose} readOnly={readOnly}
            onChange={(v) => update("purpose", v)} placeholder="วัตถุประสงค์ในการประมวลผลข้อมูล" />
          <div className="space-y-1.5">
            <Label htmlFor="risk_level">ระดับความเสี่ยง</Label>
            <select id="risk_level" value={form.risk_level} disabled={readOnly}
              onChange={(e) => update("risk_level", e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">เลือกระดับ</option>
              <option value="Low">ต่ำ</option>
              <option value="Medium">กลาง</option>
              <option value="High">สูง</option>
            </select>
          </div>
          <MultiSelect label="กลุ่มเจ้าของข้อมูล" options={dataSubjects} selected={form.data_subject_category_ids}
            onChange={(ids) => update("data_subject_category_ids", ids)} readOnly={readOnly} />
          <MultiSelect label="ประเภทข้อมูลส่วนบุคคล" options={personalDataTypes} selected={form.personal_data_type_ids}
            onChange={(ids) => update("personal_data_type_ids", ids)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 2: Data Acquisition */}
      {section === 2 && (
        <div className="space-y-4">
          <TextArea id="data_acquisition_method" label="วิธีการได้มาซึ่งข้อมูล" value={form.data_acquisition_method}
            onChange={(v) => update("data_acquisition_method", v)} readOnly={readOnly} />
          <TextArea id="data_source_direct" label="แหล่งข้อมูลโดยตรง" value={form.data_source_direct}
            onChange={(v) => update("data_source_direct", v)} readOnly={readOnly} />
          <TextArea id="data_source_other" label="แหล่งข้อมูลอื่น" value={form.data_source_other}
            onChange={(v) => update("data_source_other", v)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 3: Legal Basis */}
      {section === 3 && (
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="legal_basis_thai">ฐานกฎหมาย (PDPA)</Label>
              <Input id="legal_basis_thai" value={form.legal_basis_thai} readOnly={readOnly}
                onChange={(e) => update("legal_basis_thai", e.target.value)} placeholder="ฐานกฎหมายตาม PDPA" className="h-10 rounded-lg" />
            </div>
            {!readOnly && (
              <Button type="button" variant="outline" onClick={getSuggestions} disabled={loadingSuggestions} className="rounded-lg gap-1.5 h-10">
                {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                แนะนำ
              </Button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
              <p className="text-xs font-medium text-blue-400">คำแนะนำฐานกฎหมาย:</p>
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => applySuggestion(s)}
                  className="w-full text-left p-2 rounded-lg hover:bg-blue-500/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{s.legal_basis}</span>
                    <StatusBadge variant={s.confidence > 0.7 ? "success" : s.confidence > 0.4 ? "warning" : "default"}>
                      {Math.round(s.confidence * 100)}%
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.reasoning}</p>
                  <p className="text-xs text-slate-500 mt-0.5">มาตรา: {s.pdpa_section}</p>
                </button>
              ))}
            </div>
          )}
          {form.role_type === "Controller" && (
            <>
              <TextArea id="minor_consent_under_10" label="ความยินยอมผู้เยาว์ (อายุต่ำกว่า 10 ปี)"
                value={form.minor_consent_under_10} onChange={(v) => update("minor_consent_under_10", v)} readOnly={readOnly} />
              <TextArea id="minor_consent_10_20" label="ความยินยอมผู้เยาว์ (อายุ 10-20 ปี)"
                value={form.minor_consent_10_20} onChange={(v) => update("minor_consent_10_20", v)} readOnly={readOnly} />
            </>
          )}
        </div>
      )}

      {/* Section 4: Cross-border Transfer */}
      {section === 4 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cross_border_transfer">มีการโอนข้อมูลข้ามแดน</Label>
            <select id="cross_border_transfer" value={form.cross_border_transfer} disabled={readOnly}
              onChange={(e) => update("cross_border_transfer", e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">ไม่ระบุ</option>
              <option value="true">มี</option>
              <option value="false">ไม่มี</option>
            </select>
          </div>
          <TextArea id="cross_border_affiliate" label="บริษัทในเครือ" value={form.cross_border_affiliate}
            onChange={(v) => update("cross_border_affiliate", v)} readOnly={readOnly} />
          <TextArea id="cross_border_method" label="วิธีการโอน" value={form.cross_border_method}
            onChange={(v) => update("cross_border_method", v)} readOnly={readOnly} />
          <TextArea id="cross_border_standard" label="มาตรฐานการคุ้มครอง" value={form.cross_border_standard}
            onChange={(v) => update("cross_border_standard", v)} readOnly={readOnly} />
          <TextArea id="cross_border_exception" label="ข้อยกเว้น" value={form.cross_border_exception}
            onChange={(v) => update("cross_border_exception", v)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 5: Retention & Storage */}
      {section === 5 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="retention_period">ระยะเวลาเก็บรักษา</Label>
            <Input id="retention_period" value={form.retention_period} readOnly={readOnly}
              onChange={(e) => update("retention_period", e.target.value)} placeholder="เช่น 5 ปี" className="h-10 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="retention_expiry_date">วันหมดอายุการเก็บรักษา</Label>
              <Input id="retention_expiry_date" type="date" value={form.retention_expiry_date} readOnly={readOnly}
                onChange={(e) => update("retention_expiry_date", e.target.value)} className="h-10 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next_review_date">วันทบทวนถัดไป</Label>
              <Input id="next_review_date" type="date" value={form.next_review_date} readOnly={readOnly}
                onChange={(e) => update("next_review_date", e.target.value)} className="h-10 rounded-lg" />
            </div>
          </div>
          <TextArea id="storage_type" label="ประเภทการจัดเก็บ" value={form.storage_type}
            onChange={(v) => update("storage_type", v)} readOnly={readOnly} />
          <TextArea id="storage_method" label="วิธีการจัดเก็บ" value={form.storage_method}
            onChange={(v) => update("storage_method", v)} readOnly={readOnly} />
          <TextArea id="access_rights" label="สิทธิ์การเข้าถึง" value={form.access_rights}
            onChange={(v) => update("access_rights", v)} readOnly={readOnly} />
          <TextArea id="deletion_method" label="วิธีการลบข้อมูล" value={form.deletion_method}
            onChange={(v) => update("deletion_method", v)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 6: Data Owner & Third Party */}
      {section === 6 && (
        <div className="space-y-4">
          <TextArea id="data_owner" label="เจ้าของข้อมูล" value={form.data_owner}
            onChange={(v) => update("data_owner", v)} readOnly={readOnly} />
          <TextArea id="third_party_recipients" label="ผู้รับข้อมูลบุคคลที่สาม" value={form.third_party_recipients}
            onChange={(v) => update("third_party_recipients", v)} readOnly={readOnly} />
          <TextArea id="disclosure_exemption" label="ข้อยกเว้นการเปิดเผย" value={form.disclosure_exemption}
            onChange={(v) => update("disclosure_exemption", v)} readOnly={readOnly} />
          <TextArea id="rights_refusal" label="การปฏิเสธสิทธิ์" value={form.rights_refusal}
            onChange={(v) => update("rights_refusal", v)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 7: Security Measures */}
      {section === 7 && (
        <div className="space-y-4">
          <TextArea id="security_organizational" label="มาตรการเชิงองค์กร" value={form.security_organizational}
            onChange={(v) => update("security_organizational", v)} readOnly={readOnly} />
          <TextArea id="security_technical" label="มาตรการเชิงเทคนิค" value={form.security_technical}
            onChange={(v) => update("security_technical", v)} readOnly={readOnly} />
          <TextArea id="security_physical" label="มาตรการเชิงกายภาพ" value={form.security_physical}
            onChange={(v) => update("security_physical", v)} readOnly={readOnly} />
          <TextArea id="security_access_control" label="การควบคุมการเข้าถึง" value={form.security_access_control}
            onChange={(v) => update("security_access_control", v)} readOnly={readOnly} />
          <TextArea id="security_responsibility" label="ผู้รับผิดชอบ" value={form.security_responsibility}
            onChange={(v) => update("security_responsibility", v)} readOnly={readOnly} />
          <TextArea id="security_audit" label="การตรวจสอบ" value={form.security_audit}
            onChange={(v) => update("security_audit", v)} readOnly={readOnly} />
        </div>
      )}

      {/* Section 8: Reason (for edit) */}
      {section === 8 && (
        <div className="space-y-4">
          {isEdit && (
            <>
              {recordStatus === "rejected" && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
                  <p className="text-sm text-red-300 mb-2"><Lightbulb className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />แนะนำ: เนื่องจากบันทึกนี้ถูกปฏิเสธแล้ว กรุณาระบุว่า:</p>
                  <ul className="text-xs text-red-200/80 space-y-1 ml-2">
                    <li>• ถ้าเป็นการสร้างใหม่: "แก้การสร้างบันทึกครั้งที่ X"</li>
                    <li>• ถ้าเป็นการแก้ไข: "แก้ไข [อธิบายการเปลี่ยนแปลง]"</li>
                  </ul>
                </div>
              )}
              <TextArea id="reason" label="เหตุผลในการแก้ไข *" value={form.reason}
                onChange={(v) => update("reason", v)} readOnly={readOnly} placeholder="ระบุเหตุผลในการแก้ไข" />
            </>
          )}
          {!isEdit && (
            <TextArea id="reason" label="หมายเหตุ" value={form.reason}
              onChange={(v) => update("reason", v)} readOnly={readOnly} placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)" />
          )}
        </div>
      )}

      {/* Navigation + Submit */}
      {!readOnly && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex gap-2">
            {section > 1 && (
              <Button type="button" variant="outline" onClick={() => setSection(section - 1)} className="rounded-lg">
                ← ก่อนหน้า
              </Button>
            )}
            {section < 8 && (
              <Button type="button" variant="outline" onClick={() => setSection(section + 1)} className="rounded-lg">
                ถัดไป →
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg">ยกเลิก</Button>
            <Button type="button" onClick={onSubmit} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังบันทึก...</> : isEdit ? "บันทึกการแก้ไข" : "สร้าง ROPA Record"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
