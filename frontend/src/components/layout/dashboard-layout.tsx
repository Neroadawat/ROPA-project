"use client";

import { useAuth } from "@/contexts/auth-context";
import { Sidebar } from "./sidebar";
import { AmbientBackground } from "./ambient-background";
import { Loader2 } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen relative">
      <AmbientBackground />
      <div className="relative z-10">
        <Sidebar />
        <main className="pl-[260px]">{children}</main>
      </div>
    </div>
  );
}
