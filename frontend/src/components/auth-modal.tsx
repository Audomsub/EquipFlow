"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { X, Mail, Lock, User, Shield, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { UserRole } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "LOGIN" | "REGISTER";
}

export function AuthModal({ isOpen, onClose, initialMode = "LOGIN" }: AuthModalProps) {
  const { signInWithPassword, signUpWithPassword, isLoading } = useAuth();

  const [mode, setMode] = useState<"LOGIN" | "REGISTER">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("EMPLOYEE");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (mode === "LOGIN") {
      const res = await signInWithPassword(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("เข้าสู่ระบบสำเร็จ!");
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } else {
      if (!fullName) {
        setErrorMsg("กรุณากรอกชื่อ-นามสกุล");
        return;
      }
      const res = await signUpWithPassword(email, password, fullName, targetRole);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("ลงทะเบียนบัญชีสำเร็จเรียบร้อยแล้ว!");
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs border border-emerald-100">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="font-extrabold text-xl text-slate-900">
            {mode === "LOGIN" ? "เข้าสู่ระบบ EquipFlow" : "สร้างบัญชีผู้ใช้งานใหม่"}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === "LOGIN"
              ? "ยินดีต้อนรับกลับ! เข้าสู่ระบบเพื่อจัดการหรือเบิกอุปกรณ์"
              : "ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบยืม-คืนอุปกรณ์ IT"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2 rounded-xl transition ${
              mode === "LOGIN" ? "bg-white text-emerald-700 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("REGISTER");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2 rounded-xl transition ${
              mode === "REGISTER" ? "bg-white text-emerald-700 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            สมัครสมาชิก (Sign Up)
          </button>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "REGISTER" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล (Full Name) *</label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">อีเมลองค์กร (Corporate Email) *</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">รหัสผ่าน (Password) *</label>
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
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
          >
            {isLoading ? (
              <span>กำลังดำเนินการ...</span>
            ) : (
              <>
                <span>{mode === "LOGIN" ? "เข้าสู่ระบบ" : "ลงทะเบียนและเริ่มใช้งาน"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
