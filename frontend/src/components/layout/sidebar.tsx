"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, type UserRole } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Database,
  Upload,
  ClipboardList,
  Clock,
  Bot,
  KeyRound,
  LogOut,
  CheckCircle2,
  Building,
  Server,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[] | "all";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "หลัก",
    items: [
      { label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard, roles: "all" },
      { label: "ROPA Records", href: "/ropa-records", icon: FileText, roles: "all" },
    ],
  },
  {
    title: "ตรวจสอบ",
    items: [
      { label: "อนุมัติ ROPA", href: "/dpo/pending", icon: CheckCircle2, roles: ["DPO"] },
    ],
  },
  {
    title: "จัดการระบบ",
    items: [
      { label: "จัดการผู้ใช้", href: "/users", icon: Users, roles: ["Admin"] },
      { label: "จัดการแผนก", href: "/departments", icon: Building2, roles: ["Admin"] },
      { label: "ข้อมูลหลัก", href: "/master-data", icon: Database, roles: ["Admin"] },
      { label: "Controllers", href: "/controllers", icon: Building, roles: ["Admin"] },
      { label: "Processors", href: "/processors", icon: Server, roles: ["Admin"] },
      { label: "นำเข้า Excel", href: "/import", icon: Upload, roles: ["Admin"] },
    ],
  },
  {
    title: "บันทึก",
    items: [
      { label: "Audit Logs", href: "/audit-logs", icon: ClipboardList, roles: ["Admin"] },
      { label: "User Sessions", href: "/user-logs", icon: Clock, roles: ["Admin"] },
      { label: "AI Suggestion Logs", href: "/ai/suggestion-logs", icon: Bot, roles: ["Admin"] },
    ],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "ผู้ดูแลระบบ", DPO: "DPO", Department_User: "ผู้ใช้แผนก", Viewer_Auditor: "ผู้ตรวจสอบ",
};
const ROLE_COLORS: Record<UserRole, string> = {
  Admin: "bg-blue-500/15 text-blue-400", DPO: "bg-violet-500/15 text-violet-400",
  Department_User: "bg-emerald-500/15 text-emerald-400", Viewer_Auditor: "bg-amber-500/15 text-amber-400",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  if (!user) return null;

  const filteredSections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.roles === "all" || i.roles.includes(user.role)),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#080c16]/85 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
          <ShieldCheck className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">ROPA Platform</p>
          <p className="text-[10px] text-slate-500">by NETbay</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                      isActive
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-blue-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mx-4 h-px bg-white/[0.06]" />
      <div className="px-3 py-3 space-y-0.5">
        <Link
          href="/settings/change-password"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
            pathname === "/settings/change-password"
              ? "bg-blue-500/10 text-blue-400"
              : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
          )}
        >
          <KeyRound className="h-4 w-4" />
          <span>เปลี่ยนรหัสผ่าน</span>
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-red-500/[0.06] hover:text-red-400 transition-colors duration-150 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* User */}
      <div className="mx-3 mb-3 mt-1">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-400">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-slate-200">{user.name}</p>
            <span className={cn("inline-block mt-0.5 rounded px-1.5 py-px text-[9px] font-semibold", ROLE_COLORS[user.role])}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
