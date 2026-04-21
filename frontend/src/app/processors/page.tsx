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
import { Plus, Pencil, Trash2, Loader2, Server } from "lucide-react";
import {
  processorsApi, controllersApi, ApiError,
  type ProcessorData, type ControllerData,
} from "@/lib/api";

interface FormData { 
  name: string; 
  source_controller_id: string; 
  address: string; 
  email: string; 
  phone: string; 
  data_category: string; 
}

const EMPTY_FORM: FormData = { 
  name: "", 
  source_controller_id: "", 
  address: "", 
  email: "", 
  phone: "", 
  data_category: "general" 
};

export default function ProcessorsPage() {
  const [processors, setProcessors] = useState<ProcessorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProcessorData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProcessorData | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [controllers, setControllers] = useState<ControllerData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [procRes, ctrlRes] = await Promise.all([
        processorsApi.list({ per_page: 100, include_inactive: true }),
        controllersApi.list({ per_page: 100, include_inactive: true })
      ]);
      setProcessors(procRes.items);
      setControllers(ctrlRes.items);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "ไม่สามารถโหลดข้อมูลได้");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item: ProcessorData) => {
    setEditing(item);
    setForm({
      name: item.name,
      source_controller_id: item.source_controller_id?.toString() ?? "",
      address: item.address ?? "", email: item.email ?? "",
      phone: item.phone ?? "",
      data_category: item.data_category ?? "general",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { 
      toast.error("กรุณากรอกชื่อ Processor"); 
      return; 
    }
    if (!editing && !form.source_controller_id) { 
      toast.error("กรุณาเลือก Source Controller"); 
      return; 
    }
    setIsSubmitting(true);
    try {
      const basePayload = {
        name: form.name,
        address: form.address || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        data_category: form.data_category || "general",
      };
      if (editing) {
        const updatePayload = {
          ...basePayload,
          source_controller_id: form.source_controller_id ? Number(form.source_controller_id) : undefined,
        };
        await processorsApi.update(editing.id, updatePayload);
        toast.success("แก้ไข Processor สำเร็จ");
      } else {
        const createPayload = {
          ...basePayload,
          source_controller_id: Number(form.source_controller_id),
        };
        await processorsApi.create(createPayload);
        toast.success("สร้าง Processor สำเร็จ");
      }
      setShowForm(false);
      fetchData();
    } catch (err) { 
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await processorsApi.deactivate(deleteTarget.id);
      toast.success("ปิดใช้งาน Processor สำเร็จ");
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด"); }
  };

  const columns: Column<ProcessorData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อ Processor", sortable: true, render: (item) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10"><Server className="h-4 w-4 text-emerald-400" /></div>
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
        </div>
      </div>
    )},
    { key: "source_controller", label: "Source Controller", sortable: false, render: (item: ProcessorData & { controller_name?: string }) => {
      return <span className="text-muted-foreground">{item.controller_name || "ไม่มีการเลือก"}</span>;
    }},
    { key: "is_active", label: "สถานะ", render: (item) => <StatusBadge variant={item.is_active ? "success" : "default"} dot>{item.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge> },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  if (loading) {
    return (<DashboardLayout><Header title="จัดการ Processor" description="เพิ่ม แก้ไข และจัดการ Processor ในระบบ" /><div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout>
      <Header title="จัดการ Processor" description="เพิ่ม แก้ไข และจัดการ Processor ในระบบ" actions={<Button onClick={openCreate} className="rounded-lg gap-1.5"><Plus className="h-4 w-4" />เพิ่ม Processor</Button>} />
      <div className="p-6">
        <DataTable columns={columns} data={processors.map(p => ({
          ...p,
          controller_name: controllers.find(c => c.id === p.source_controller_id)?.name || ""
        }))} searchPlaceholder="ค้นหา Processor..." searchKeys={["name", "email", "controller_name"]} pageSize={10} emptyMessage="ไม่พบ Processor"
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
              {item.is_active && <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(item)} title="ปิดใช้งาน" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
            </>
          )}
        />
      </div>
      <FormModal open={showForm} title={editing ? "แก้ไข Processor" : "เพิ่ม Processor ใหม่"} description={editing ? `แก้ไขข้อมูลของ ${editing.name}` : "กรอกข้อมูลเพื่อสร้าง Processor ใหม่"} isLoading={isSubmitting} onSubmit={handleSubmit} onCancel={() => setShowForm(false)}>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="proc-name">ชื่อ *</Label><Input id="proc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อ Processor" className="h-10 rounded-lg" /></div>
          <div className="space-y-2">
            <Label htmlFor="proc-controller">Controller *</Label>
            <select 
              id="proc-controller" 
              value={form.source_controller_id} 
              onChange={(e) => setForm((f) => ({ ...f, source_controller_id: e.target.value }))}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">เลือก Source Controller</option>
              {controllers.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="proc-address">ที่อยู่</Label><Input id="proc-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="ที่อยู่" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="proc-email">อีเมล</Label><Input id="proc-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="proc-phone">โทรศัพท์</Label><Input id="proc-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0xx-xxx-xxxx" className="h-10 rounded-lg" /></div>
        </div>
      </FormModal>
      <ConfirmDialog open={!!deleteTarget} title="ปิดใช้งาน Processor" description={`คุณต้องการปิดใช้งาน "${deleteTarget?.name}" ใช่หรือไม่? Processor ที่ถูกอ้างอิงโดย ROPA Records จะไม่สามารถปิดใช้งานได้`} confirmLabel="ปิดใช้งาน" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </DashboardLayout>
  );
}