import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default" | "purple";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  warning: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
  danger: "bg-red-500/15 text-red-300 ring-red-500/25",
  info: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  purple: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  default: "bg-white/[0.08] text-slate-300 ring-white/[0.1]",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  success: "bg-emerald-400", warning: "bg-amber-400", danger: "bg-red-400",
  info: "bg-blue-400", purple: "bg-violet-400", default: "bg-slate-400",
};

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ variant = "default", children, dot = false, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", VARIANT_STYLES[variant], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}
