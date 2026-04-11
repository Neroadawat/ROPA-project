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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  usersApi,
  departmentsApi,
  ApiError,
  type UserData,
  type DepartmentData,
} from "@/lib/api";

const ROLES = ["Admin", "DPO", "Department_User", "Viewer_Auditor"];

const ROLE_BADGE: Record<string, { variant: "info" | "purple" | "success" | "warning"; label: string }> = {
  Admin: { variant: "info", label: "Admin" },
  DPO: { variant: "purple", label: "DPO" },
  Department_User: { variant: "success", label: "Department User" },
  Viewer_Auditor: { variant: "warning", label: "Viewer / Auditor" },
};

interface FormData {
  email: string;
  name: string;
  password: string;
  role: string;
  department_id: string;
}

const EMPTY_FORM: FormData = { email: "", name: "", password: "", role: "Department_User", department_id: "" };

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        usersApi.list({ per_page: 100 }),
        departmentsApi.list({ per_page: 100 }),
      ]);
      setUsers(usersRes.items);
      setDepartments(deptsRes.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
      else toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDeptName = (deptId: number | null) => {
    if (!deptId) return "-";
    return departments.find((d) => d.id === deptId)?.name ?? "-";
  };

  const openCreate = () => { setEditingUser(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (user: UserData) => {
    setEditingUser(user);
    setForm({ email: user.email, name: user.name, password: "", role: user.role, department_id: user.department_id?.toString() ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.email || !form.name || !form.role) { toast.error("กรุณากรอกข้อมูลให้ครบถ้วน"); return; }
    if (!editingUser && !form.password) { toast.error("กรุณากรอกรหัสผ่าน"); return; }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          name: form.name,
          role: form.role,
          department_id: form.department_id ? Number(form.department_id) : null,
        });
        toast.success("แก้ไขผู้ใช้สำเร็จ");
      } else {
        await usersApi.create({
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role,
          department_id: form.department_id ? Number(form.department_id) : null,
        });
        toast.success("สร้างผู้ใช้สำเร็จ");
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
      await usersApi.deactivate(deleteTarget.id);
      toast.success("ปิดใช้งานผู้ใช้สำเร็จ");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "เกิดข้อผิดพลาด");
    }
  };

  let filteredData = users;
  if (filterRole) filteredData = filteredData.filter((u) => u.role === filterRole);
  if (filterStatus === "active") filteredData = filteredData.filter((u) => u.is_active);
  if (filterStatus === "inactive") filteredData = filteredData.filter((u) => !u.is_active);

  const columns: Column<UserData>[] = [
    { key: "id", label: "#", className: "w-[60px]", render: (_item, idx) => <span className="text-muted-foreground">{idx + 1}</span> },
    { key: "name", label: "ชื่อ", sortable: true, render: (item) => (<div><p className="font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.email}</p></div>) },
    { key: "role", label: "บทบาท", sortable: true, render: (item) => { const b = ROLE_BADGE[item.role]; return b ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge> : item.role; } },
    { key: "department_id", label: "แผนก", sortable: true, render: (item) => getDeptName(item.department_id) },
    { key: "is_active", label: "สถานะ", render: (item) => <StatusBadge variant={item.is_active ? "success" : "default"} dot>{item.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</StatusBadge> },
    { key: "created_at", label: "สร้างเมื่อ", sortable: true, render: (item) => <span className="text-muted-foreground text-xs">{new Date(item.created_at).toLocaleDateString("th-TH")}</span> },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="จัดการผู้ใช้" description="เพิ่ม แก้ไข และจัดการบัญชีผู้ใช้ในระบบ" />
        <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="จัดการผู้ใช้" description="เพิ่ม แก้ไข และจัดการบัญชีผู้ใช้ในระบบ" actions={<Button onClick={openCreate} className="rounded-lg gap-1.5"><Plus className="h-4 w-4" />เพิ่มผู้ใช้</Button>} />
      <div className="p-6">
        <DataTable columns={columns} data={filteredData} searchPlaceholder="ค้นหาชื่อ, อีเมล..." searchKeys={["name", "email"]} pageSize={10} emptyMessage="ไม่พบผู้ใช้"
          filters={
            <div className="flex items-center gap-2">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกบทบาท</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_BADGE[r]?.label ?? r}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                <option value="">ทุกสถานะ</option><option value="active">ใช้งาน</option><option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>
          }
          actions={(item) => (
            <>
              <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)} title="แก้ไข"><Pencil className="h-3.5 w-3.5" /></Button>
              {item.is_active && <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(item)} title="ปิดใช้งาน" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
            </>
          )}
        />
      </div>

      <FormModal open={showForm} title={editingUser ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"} description={editingUser ? `แก้ไขข้อมูลของ ${editingUser.name}` : "กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้ใหม่"} isLoading={isSubmitting} onSubmit={handleSubmit} onCancel={() => setShowForm(false)}>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="user-name">ชื่อ-นามสกุล *</Label><Input id="user-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="กรอกชื่อ-นามสกุล" className="h-10 rounded-lg" /></div>
          <div className="space-y-2"><Label htmlFor="user-email">อีเมล *</Label><Input id="user-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" className="h-10 rounded-lg" disabled={!!editingUser} /></div>
          {!editingUser && <div className="space-y-2"><Label htmlFor="user-password">รหัสผ่าน *</Label><Input id="user-password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="กรอกรหัสผ่าน" className="h-10 rounded-lg" /></div>}
          <div className="space-y-2"><Label htmlFor="user-role">บทบาท *</Label><select id="user-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{ROLES.map((r) => <option key={r} value={r}>{ROLE_BADGE[r]?.label ?? r}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="user-dept">แผนก</Label><select id="user-dept" value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">ไม่ระบุ</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        </div>
      </FormModal>

      <ConfirmDialog open={!!deleteTarget} title="ปิดใช้งานผู้ใช้" description={`คุณต้องการปิดใช้งาน "${deleteTarget?.name}" ใช่หรือไม่?`} confirmLabel="ปิดใช้งาน" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </DashboardLayout>
  );
}
