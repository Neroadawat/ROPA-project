"use client";

import { useAuth } from "@/contexts/auth-context";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-[#080c16]/60 backdrop-blur-xl px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-slate-400">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
