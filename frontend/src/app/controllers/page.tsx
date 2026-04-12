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
import { Plus, Pencil, Trash2, Loader2, Building } from "lucide-react";
import { controllersApi, ApiError, type ControllerData } from "@/lib/api";

interface FormData { name: string; address: string; email: string; phone: string; }
const EMPTY_FORM: FormData = { name: "", address: "", email: "", phone: "" };

export default function ControllersPage() {
  const [controllers, setControllers] = useState<ControllerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ControllerData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ControllerData | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await controllersApi.list({ per_page: 100, include_inactive: true });
      setControllers(res.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item: ControllerData) => {
    setEditing(item);
    setForm({ name: item.name, address: item.address ?? "", email: item.email ?? "", phone: item.phone ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { toast.error("กรุณากรอกชื่อ Controller"); return; }
    setIsSubmitting(true);
    try {
      const payload = { name: form.name, address: form.address || undefined, email: form.email || undefined, phone: form.phone || undefined };
      if (editing) {
        await controllersApi.update(editing.id, payload);
        toast.success("แก้ไข Controller สำเร็จ");
      } else {
        await controllersApi.create(payload);
        toast.success("สร้าง Controller สำเร็จ");
      }
      setShowForm(false);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await controllersApi.deactivate(deleteTarget.id);
      toast.success("ปิดใช้งาน Controller สำเร็จ");
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
  };

  const columns: Column<ControllerData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อ Controller", sortable: true, render: (item) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10"><Building className="h-4 w-4 text-blue-400" /></div>
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
        </div>
      </div>
    )},
    { key: "address", label: "ที่อยู่", render: (item) => <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{item.address || "-"}</span> },
    { key: "phone", label: "โทรศัพท์", render: (item) => <span className="text-sm text-muted-foreground">{item.phone || "-"}</span> },
    { key: "is_active", label: "สถานะ", render: (item) => <StatusBadge variant={item.is_active ? "success" : "default"} dot>{item.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge> },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="จัดการ Controller" description="เพิ่ม แก้ไข และจัดการ Controller ในระบบ" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="จัดการ Controller" description="เพิ่ม แก้ไข และจัดการ Controller ในระบบ" actions={<Button onClick={openCreate} className="rounded-lg gap-1.5"><Plus className="h-4 w-4" />เพิ่ม Controller</Button>} />
      <div className="p-6">
        <DataTable columns={columns} data={controllers} searchPlaceholder="ค้นหา Controller..." searchKeys={["name", "email"]} pageSize={10} emptyMessage="ไม่พบ Controller"
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
              {item.is_active && <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(item)} title="ปิดใช้งาน" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
            </>
          )}
        />
      </div>
      <FormModal open={showForm} title={editing ? "แก้ไข Controller" : "เพิ่ม Controller ใหม่"} description={editing ? `แก้ไขข้อมูลของ ${editing.name}` : "กรอกข้อมูลเพื่อสร้าง Controller ใหม่"} isLoading={isSubmitting} onSubmit={handleSubmit} onCancel={() => setShowForm(false)}>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="ctrl-name">ชื่อ *</Label><Input id="ctrl-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อ Controller" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="ctrl-address">ที่อยู่</Label><Input id="ctrl-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="ที่อยู่" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="ctrl-email">อีเมล</Label><Input id="ctrl-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="ctrl-phone">โทรศัพท์</Label><Input id="ctrl-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0xx-xxx-xxxx" className="h-10 rounded-lg" /></div>
        </div>
      </FormModal>
      <ConfirmDialog open={!!deleteTarget} title="ปิดใช้งาน Controller" description={`คุณต้องการปิดใช้งาน "${deleteTarget?.name}" ใช่หรือไม่? Controller ที่ถูกอ้างอิงโดย ROPA Records จะไม่สามารถปิดใช้งานได้`} confirmLabel="ปิดใช้งาน" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </DashboardLayout>
  );
}
