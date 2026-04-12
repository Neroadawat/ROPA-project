"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormModal } from "@/components/shared/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Database, Tag } from "lucide-react";
import {
  masterDataApi,
  ApiError,
  type DataSubjectCategoryData,
  type PersonalDataTypeData,
} from "@/lib/api";

type ActiveTab = "subjects" | "dataTypes";

interface SubjectForm { name: string; description: string; }
interface DataTypeForm { name: string; category: string; sensitivity_level: string; }

const EMPTY_SUBJECT: SubjectForm = { name: "", description: "" };
const EMPTY_DATATYPE: DataTypeForm = { name: "", category: "", sensitivity_level: "" };

const SENSITIVITY_OPTIONS = [
  { label: "ทั่วไป", value: "general" },
  { label: "อ่อนไหว", value: "sensitive" }
];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("subjects");
  const [subjects, setSubjects] = useState<DataSubjectCategoryData[]>([]);
  const [dataTypes, setDataTypes] = useState<PersonalDataTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Subject form state
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<DataSubjectCategoryData | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<DataSubjectCategoryData | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(EMPTY_SUBJECT);

  // DataType form state
  const [showDataTypeForm, setShowDataTypeForm] = useState(false);
  const [editingDataType, setEditingDataType] = useState<PersonalDataTypeData | null>(null);
  const [deleteDataType, setDeleteDataType] = useState<PersonalDataTypeData | null>(null);
  const [dataTypeForm, setDataTypeForm] = useState<DataTypeForm>(EMPTY_DATATYPE);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, dtRes] = await Promise.all([
        masterDataApi.listDataSubjectCategories({ per_page: 100 }),
        masterDataApi.listPersonalDataTypes({ per_page: 100 }),
      ]);
      setSubjects(subRes.items);
      setDataTypes(dtRes.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Subject CRUD ───
  const openCreateSubject = () => { setEditingSubject(null); setSubjectForm(EMPTY_SUBJECT); setShowSubjectForm(true); };
  const openEditSubject = (item: DataSubjectCategoryData) => {
    setEditingSubject(item);
    setSubjectForm({ name: item.name, description: item.description ?? "" });
    setShowSubjectForm(true);
  };

  const handleSubjectSubmit = async () => {
    if (!subjectForm.name) { toast.error("กรุณากรอกชื่อกลุ่มเจ้าของข้อมูล"); return; }
    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await masterDataApi.updateDataSubjectCategory(editingSubject.id, {
          name: subjectForm.name,
          description: subjectForm.description || undefined,
        });
        toast.success("แก้ไขกลุ่มเจ้าของข้อมูลสำเร็จ");
      } else {
        await masterDataApi.createDataSubjectCategory({
          name: subjectForm.name,
          description: subjectForm.description || undefined,
        });
        toast.success("สร้างกลุ่มเจ้าของข้อมูลสำเร็จ");
      }
      setShowSubjectForm(false);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
    finally { setIsSubmitting(false); }
  };

  const handleSubjectDelete = async () => {
    if (!deleteSubject) return;
    try {
      await masterDataApi.deleteDataSubjectCategory(deleteSubject.id);
      toast.success("ลบกลุ่มเจ้าของข้อมูลสำเร็จ");
      setDeleteSubject(null);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
  };

  // ─── DataType CRUD ───
  const openCreateDataType = () => { setEditingDataType(null); setDataTypeForm(EMPTY_DATATYPE); setShowDataTypeForm(true); };
  const openEditDataType = (item: PersonalDataTypeData) => {
    setEditingDataType(item);
    setDataTypeForm({ name: item.name, category: item.category ?? "", sensitivity_level: item.sensitivity_level ?? "" });
    setShowDataTypeForm(true);
  };

  const handleDataTypeSubmit = async () => {
    if (!dataTypeForm.name) { toast.error("กรุณากรอกชื่อประเภทข้อมูล"); return; }
    setIsSubmitting(true);
    try {
      if (editingDataType) {
        await masterDataApi.updatePersonalDataType(editingDataType.id, {
          name: dataTypeForm.name,
          category: dataTypeForm.category || undefined,
          sensitivity_level: dataTypeForm.sensitivity_level || undefined,
        });
        toast.success("แก้ไขประเภทข้อมูลสำเร็จ");
      } else {
        await masterDataApi.createPersonalDataType({
          name: dataTypeForm.name,
          category: dataTypeForm.category || undefined,
          sensitivity_level: dataTypeForm.sensitivity_level || undefined,
        });
        toast.success("สร้างประเภทข้อมูลสำเร็จ");
      }
      setShowDataTypeForm(false);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
    finally { setIsSubmitting(false); }
  };

  const handleDataTypeDelete = async () => {
    if (!deleteDataType) return;
    try {
      await masterDataApi.deletePersonalDataType(deleteDataType.id);
      toast.success("ลบประเภทข้อมูลสำเร็จ");
      setDeleteDataType(null);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
  };

  // ─── Columns ───
  const subjectColumns: Column<DataSubjectCategoryData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อกลุ่ม", sortable: true, render: (item) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Database className="h-4 w-4 text-primary" /></div>
        <span className="font-medium text-foreground">{item.name}</span>
      </div>
    )},
    { key: "description", label: "คำอธิบาย", render: (item) => <span className="text-sm text-muted-foreground">{item.description || "-"}</span> },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  const dataTypeColumns: Column<PersonalDataTypeData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อประเภท", sortable: true, render: (item) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10"><Tag className="h-4 w-4 text-violet-400" /></div>
        <span className="font-medium text-foreground">{item.name}</span>
      </div>
    )},
    { key: "category", label: "หมวดหมู่", render: (item) => <span className="text-sm text-muted-foreground">{item.category || "-"}</span> },
    { key: "sensitivity_level", label: "ระดับความอ่อนไหว", render: (item) => {const displayLabel = SENSITIVITY_OPTIONS.find(opt => opt.value === item.sensitivity_level)?.label || item.sensitivity_level || "-";return <span className="text-sm text-muted-foreground">{displayLabel}</span>;} },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="ข้อมูลหลัก" description="จัดการกลุ่มเจ้าของข้อมูลและประเภทข้อมูลส่วนบุคคล" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header
        title="ข้อมูลหลัก"
        description="จัดการกลุ่มเจ้าของข้อมูลและประเภทข้อมูลส่วนบุคคล"
        actions={
          <Button onClick={activeTab === "subjects" ? openCreateSubject : openCreateDataType} className="rounded-lg gap-1.5">
            <Plus className="h-4 w-4" />
            {activeTab === "subjects" ? "เพิ่มกลุ่มเจ้าของข้อมูล" : "เพิ่มประเภทข้อมูล"}
          </Button>
        }
      />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/50 w-fit">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "subjects" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Database className="h-4 w-4 inline-block mr-2" />
            กลุ่มเจ้าของข้อมูล ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab("dataTypes")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "dataTypes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Tag className="h-4 w-4 inline-block mr-2" />
            ประเภทข้อมูลส่วนบุคคล ({dataTypes.length})
          </button>
        </div>

        {activeTab === "subjects" ? (
          <DataTable
            columns={subjectColumns}
            data={subjects}
            searchPlaceholder="ค้นหากลุ่มเจ้าของข้อมูล..."
            searchKeys={["name", "description"]}
            pageSize={10}
            emptyMessage="ไม่พบกลุ่มเจ้าของข้อมูล"
            actions={(item) => (
              <>
                <Button variant="ghost" size="icon-xs" onClick={() => openEditSubject(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setDeleteSubject(item)} title="ลบ" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            )}
          />
        ) : (
          <DataTable
            columns={dataTypeColumns}
            data={dataTypes}
            searchPlaceholder="ค้นหาประเภทข้อมูล..."
            searchKeys={["name", "category"]}
            pageSize={10}
            emptyMessage="ไม่พบประเภทข้อมูล"
            actions={(item) => (
              <>
                <Button variant="ghost" size="icon-xs" onClick={() => openEditDataType(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setDeleteDataType(item)} title="ลบ" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            )}
          />
        )}
      </div>

      {/* Subject Form Modal */}
      <FormModal
        open={showSubjectForm}
        title={editingSubject ? "แก้ไขกลุ่มเจ้าของข้อมูล" : "เพิ่มกลุ่มเจ้าของข้อมูลใหม่"}
        description={editingSubject ? `แก้ไขข้อมูลของ ${editingSubject.name}` : "กรอกข้อมูลเพื่อสร้างกลุ่มเจ้าของข้อมูลใหม่"}
        isLoading={isSubmitting}
        onSubmit={handleSubjectSubmit}
        onCancel={() => setShowSubjectForm(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">ชื่อกลุ่ม *</Label>
            <Input id="subject-name" value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น ลูกค้า, พนักงาน" className="h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject-desc">คำอธิบาย</Label>
            <Input id="subject-desc" value={subjectForm.description} onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))} placeholder="คำอธิบายเพิ่มเติม" className="h-10 rounded-lg" />
          </div>
        </div>
      </FormModal>

      {/* DataType Form Modal */}
      <FormModal
        open={showDataTypeForm}
        title={editingDataType ? "แก้ไขประเภทข้อมูล" : "เพิ่มประเภทข้อมูลใหม่"}
        description={editingDataType ? `แก้ไขข้อมูลของ ${editingDataType.name}` : "กรอกข้อมูลเพื่อสร้างประเภทข้อมูลใหม่"}
        isLoading={isSubmitting}
        onSubmit={handleDataTypeSubmit}
        onCancel={() => setShowDataTypeForm(false)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dt-name">ชื่อประเภท *</Label>
            <Input id="dt-name" value={dataTypeForm.name} onChange={(e) => setDataTypeForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น ชื่อ-นามสกุล, เลขบัตรประชาชน" className="h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-category">หมวดหมู่</Label>
            <Input id="dt-category" value={dataTypeForm.category} onChange={(e) => setDataTypeForm((f) => ({ ...f, category: e.target.value }))} placeholder="เช่น ข้อมูลระบุตัวตน" className="h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dt-sensitivity">ระดับความอ่อนไหว</Label>
            <select id="dt-sensitivity" value={dataTypeForm.sensitivity_level} onChange={(e) => setDataTypeForm((f) => ({ ...f, sensitivity_level: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground">
              <option value="">-- เลือก --</option>
              {SENSITIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormModal>

      {/* Confirm Dialogs */}
      <ConfirmDialog open={!!deleteSubject} title="ลบกลุ่มเจ้าของข้อมูล" description={`คุณต้องการลบ "${deleteSubject?.name}" ใช่หรือไม่?`} confirmLabel="ลบ" variant="danger" onConfirm={handleSubjectDelete} onCancel={() => setDeleteSubject(null)} />
      <ConfirmDialog open={!!deleteDataType} title="ลบประเภทข้อมูล" description={`คุณต้องการลบ "${deleteDataType?.name}" ใช่หรือไม่?`} confirmLabel="ลบ" variant="danger" onConfirm={handleDataTypeDelete} onCancel={() => setDeleteDataType(null)} />
    </DashboardLayout>
  );
}
