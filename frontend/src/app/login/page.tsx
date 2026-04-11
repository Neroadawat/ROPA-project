"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

const DEV_ACCOUNTS = [
  { email: "admin@triangle.com", password: "admin123456", role: "Admin" },
  { email: "DPO@triangle.com", password: "DPO123456", role: "DPO" },
  { email: "Department@triangle.com", password: "Department123456", role: "Department_User" },
  { email: "Auditor@triangle.com", password: "Auditor123456", role: "Viewer_Auditor" },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-blue-100 text-blue-700",
  DPO: "bg-violet-100 text-violet-700",
  Department_User: "bg-emerald-100 text-emerald-700",
  Viewer_Auditor: "bg-amber-100 text-amber-700",
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("เข้าสู่ระบบสำเร็จ");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[oklch(0.17_0.04_265)]">
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
            style={{ background: "oklch(0.45 0.18 262)" }}
            animate={{ x: [0, 60, -30, 0], y: [0, -40, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            initial={{ top: "-10%", left: "-10%" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[80px]"
            style={{ background: "oklch(0.55 0.15 18)" }}
            animate={{ x: [0, -50, 40, 0], y: [0, 60, -30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            initial={{ bottom: "-5%", right: "-5%" }}
          />
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-[60px]"
            style={{ background: "oklch(0.6 0.2 180)" }}
            animate={{ x: [0, 30, -20, 0], y: [0, -50, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            initial={{ top: "40%", left: "30%" }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">ROPA Platform</p>
              <p className="text-xs text-white/50">For NETbay</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
            <h2 className="text-5xl font-bold leading-[1.15] mb-6 tracking-tight">
              ROPA<br />
              <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent">By Lonein</span>
            </h2>
            <p className="text-base text-white/60 leading-relaxed max-w-sm">
              รวมศูนย์ข้อมูลกิจกรรมการประมวลผลข้อมูลส่วนบุคคล
              ให้เป็นระบบ ค้นหาได้ ตรวจสอบได้ ตาม PDPA
            </p>
            <motion.div className="mt-10 p-5 rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/10 max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-white/80">ภาพรวมระบบ</p>
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Live</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "ROPA Records", value: "—" }, { label: "แผนก", value: "—" }, { label: "Compliance", value: "—" }].map((s) => (
                  <div key={s.label}><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-[11px] text-white/40 mt-0.5">{s.label}</p></div>
                ))}
              </div>
            </motion.div>
          </motion.div>
          <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.7 }}>
            {[{ label: "PDPA Compliant", color: "bg-emerald-400" }, { label: "Audit Trail", color: "bg-sky-400" }, { label: "AI-Powered", color: "bg-violet-400" }].map((b) => (
              <span key={b.label} className="flex items-center gap-2 text-xs text-white/50 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <span className={`w-1.5 h-1.5 rounded-full ${b.color}`} />{b.label}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div className="w-full max-w-[420px]" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary"><ShieldCheck className="w-5 h-5 text-primary-foreground" /></div>
            <h1 className="text-xl font-semibold text-foreground">ROPA Platform</h1>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">ยินดีต้อนรับ</h1>
            <p className="text-muted-foreground mt-2">เข้าสู่ระบบเพื่อจัดการข้อมูล ROPA ของคุณ</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">อีเมล</Label>
              <Input id="email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">รหัสผ่าน</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="h-12 rounded-xl px-4 pr-11 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>
            {error && (
              <motion.div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-xl" role="alert" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.div>
            )}
            <Button type="submit" className="w-full h-12 rounded-xl text-[15px] font-semibold cursor-pointer group" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />กำลังเข้าสู่ระบบ...</>) : (<>เข้าสู่ระบบ<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" /></>)}
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t border-border/60">
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />บัญชีทดสอบ (Development)
            </p>
            <div className="flex flex-col gap-2">
              {DEV_ACCOUNTS.map((acc) => (
                <button key={acc.email} type="button" onClick={() => { setEmail(acc.email); setPassword(acc.password); setError(""); }}
                  className="flex items-center justify-between px-4 py-2.5 text-sm rounded-xl border border-border/60 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200 cursor-pointer group">
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors">{acc.email}</span>
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLORS[acc.role]}`}>{acc.role.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground/60 mt-8">© 2026 NETbay Public Company Limited</p>
        </motion.div>
      </div>
    </div>
  );
}
