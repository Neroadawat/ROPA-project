"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <DashboardLayout>
      <Header
        title="แดชบอร์ด"
        description="ภาพรวมการจัดการ ROPA ขององค์กร"
      />
      <div className="p-6">
        <p className="text-muted-foreground">
          ยินดีต้อนรับ {user.name} — หน้านี้จะถูกพัฒนาเพิ่มเติมในขั้นตอนถัดไป
        </p>
      </div>
    </DashboardLayout>
  );
}
