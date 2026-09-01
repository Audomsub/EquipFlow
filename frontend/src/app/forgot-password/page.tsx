"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Laptop, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setErrorMsg(error.message || "ไม่สามารถส่งคำขอรีเซ็ตรหัสผ่านได้");
      } else {
        setSuccessMsg("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความ (Inbox / Spam)");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/20 mb-2">
            <Laptop className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            รีเซ็ตรหัสผ่าน
            <Sparkles className="h-4 w-4 text-emerald-500 fill-emerald-500" />
          </h1>
          <p className="text-xs text-slate-500">
            กรอกอีเมลองค์กรของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              อีเมลองค์กร (Enterprise Email)
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span>กำลังส่งข้อมูล...</span>
            ) : (
              <>
                <span>ส่งลิงก์ตั้งรหัสผ่านใหม่</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>กลับสู่หน้าเข้าสู่ระบบ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
