"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Laptop, Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithPassword, switchRole, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await signInWithPassword(email, password);
      if (res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("ตรวจสอบสิทธิ์และเข้าสู่ระบบสำเร็จ กำลังนำท่านเข้าสู่ระบบ...");

      // Redirection based on role permissions
      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 text-white">
            <Laptop className="h-6 w-6" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            EquipFlow
            <Sparkles className="h-4 w-4 text-emerald-500 fill-emerald-500" />
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            ระบบบริหารจัดการและยืม-คืนอุปกรณ์ IT ระดับองค์กร
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              อีเมลองค์กร (Corporate Email)
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="name@equipflow.local หรือ user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">รหัสผ่าน (Password)</label>
              <Link href="/forgot-password" className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span>กำลังตรวจสอบสิทธิ์...</span>
            ) : (
              <>
                <span>เข้าสู่ระบบ (Sign In)</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            ยังไม่มีบัญชีผู้ใช้งาน?{" "}
            <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700">
              สมัครสมาชิกใหม่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
