"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormModal } from "@/components/shared/form-modal";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Building2, Loader2 } from "lucide-react";
import { departmentsApi, ApiError, type DepartmentData } from "@/lib/api";

interface FormData { name: string; code: string; }
const EMPTY_FORM: FormData = { name: "", code: "" };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentData | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await departmentsApi.list({ per_page: 100 });
      setDepartments(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingDept(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (dept: DepartmentData) => { setEditingDept(dept); setForm({ name: dept.name, code: dept.code }); setShowForm(true); };

  const handleSubmit = async () => {
    if (!form.name || !form.code) { toast.error("กรุณากรอกข้อมูลให้ครบถ้วน"); return; }
    setIsSubmitting(true);
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept.id, { name: form.name, code: form.code.toUpperCase() });
        toast.success("แก้ไขแผนกสำเร็จ");
      } else {
        await departmentsApi.create({ name: form.name, code: form.code.toUpperCase() });
        toast.success("สร้างแผนกสำเร็จ");
      }
      setShowForm(false);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await departmentsApi.delete(deleteTarget.id);
      toast.success("ลบแผนกสำเร็จ");
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
  };

  const columns: Column<DepartmentData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อแผนก", sortable: true, render: (item) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-4 w-4 text-primary" /></div>
        <div><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">รหัส: {item.code}</p></div>
      </div>
    )},
    { key: "is_active", label: "สถานะ", render: (item) => <StatusBadge variant={item.is_active ? "success" : "default"} dot>{item.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge> },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="จัดการแผนก" description="เพิ่ม แก้ไข และจัดการแผนกในองค์กร" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="จัดการแผนก" description="เพิ่ม แก้ไข และจัดการแผนกในองค์กร" actions={<Button onClick={openCreate} className="rounded-lg gap-1.5"><Plus className="h-4 w-4" />เพิ่มแผนก</Button>} />
      <div className="p-6">
        <DataTable columns={columns} data={departments} searchPlaceholder="ค้นหาชื่อแผนก, รหัส..." searchKeys={["name", "code"]} pageSize={10} emptyMessage="ไม่พบแผนก"
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(item)} title="ลบ" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </>
          )}
        />
      </div>
      <FormModal open={showForm} title={editingDept ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"} description={editingDept ? `แก้ไขข้อมูลของ ${editingDept.name}` : "กรอกข้อมูลเพื่อสร้างแผนกใหม่"} isLoading={isSubmitting} onSubmit={handleSubmit} onCancel={() => setShowForm(false)}>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="dept-name">ชื่อแผนก *</Label><Input id="dept-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="เช่น IT Department" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="dept-code">รหัสแผนก *</Label><Input id="dept-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="เช่น IT" maxLength={10} className="h-10 rounded-lg uppercase" /><p className="text-xs text-muted-foreground">รหัสแผนกจะถูกแปลงเป็นตัวพิมพ์ใหญ่อัตโนมัติ</p></div>
        </div>
      </FormModal>
      <ConfirmDialog open={!!deleteTarget} title="ลบแผนก" description={`คุณต้องการลบแผนก "${deleteTarget?.name}" ใช่หรือไม่?`} confirmLabel="ลบ" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </DashboardLayout>
  );
}
