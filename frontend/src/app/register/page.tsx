"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { UserRole } from "@/types";
import { Laptop, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("EMPLOYEE");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    if (!fullName) {
      setErrorMsg("กรุณาระบุชื่อ-นามสกุล");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await signUpWithPassword(email, password, fullName, targetRole);
      if (res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("สร้างบัญชีผู้ใช้งานสำเร็จ! กำลังนำทางไปหน้าหลักตามสิทธิ์ของท่าน...");

      setTimeout(() => {
        if (targetRole === "SUPER_ADMIN") {
          router.push("/?tab=users");
        } else if (targetRole === "IT_ADMIN") {
          router.push("/?tab=admin");
        } else {
          router.push("/?tab=assets");
        }
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 text-white">
            <Laptop className="h-6 w-6" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 flex items-center justify-center gap-1.5">
            EquipFlow
            <Sparkles className="h-4 w-4 text-emerald-500 fill-emerald-500" />
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            สมัครสมาชิกใหม่เพื่อขอใช้งานและเบิกยืมอุปกรณ์ IT
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

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ชื่อ-นามสกุล (Full Name) *
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="เช่น สมศักดิ์ มั่นคง"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              อีเมลองค์กร (Corporate Email) *
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รหัสผ่าน (Password) *
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="ความยาวอย่างน้อย 8 ตัวอักษร"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              บทบาทที่ต้องการเริ่มต้น (Requested Role)
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as UserRole)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="EMPLOYEE">EMPLOYEE (พนักงานทั่วไป - จองยืมและดูประวัติของตนเอง)</option>
              <option value="IT_ADMIN">IT_ADMIN (เจ้าหน้าที่ IT - จัดการอุปกรณ์ ตรวจสอบ ส่งมอบ)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (ผู้ดูแลระบบสูงสุด - มอบสิทธิ์และจัดการผู้ใช้)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span>กำลังสร้างบัญชีผู้ใช้...</span>
            ) : (
              <>
                <span>สมัครสมาชิกและเริ่มใช้งาน</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
            <Link href="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
