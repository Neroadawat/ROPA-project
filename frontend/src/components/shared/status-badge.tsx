import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default" | "purple";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/20",
  default: "bg-slate-100 text-slate-600 ring-slate-500/20",
};
const DOT_COLORS: Record<BadgeVariant, string> = {
  success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500",
  info: "bg-blue-500", purple: "bg-violet-500", default: "bg-slate-400",
};

interface StatusBadgeProps { variant?: BadgeVariant; children: React.ReactNode; dot?: boolean; className?: string; }

export function StatusBadge({ variant = "default", children, dot = false, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", VARIANT_STYLES[variant], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
