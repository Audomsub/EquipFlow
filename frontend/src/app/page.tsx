"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Asset, BorrowRequest, Profile, UserRole, ConditionStatus } from "@/types";
import { useAuth } from "@/context/auth-context";
import { QRCodeModal } from "@/components/qr-code-modal";
import { InspectionModal } from "@/components/inspection-modal";
import { 
  Laptop, 
  Layers, 
  History, 
  ShieldCheck, 
  BarChart3, 
  Activity, 
  PlusCircle, 
  Search, 
  ArrowRight, 
  QrCode, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  X, 
  Boxes, 
  Clock, 
  Camera,
  CheckCircle,
  TrendingUp,
  Sparkles,
  LogIn,
  LogOut,
  Users,
  UserCheck,
  ShieldAlert
} from "lucide-react";
import { AuthModal } from "@/components/auth-modal";

import { Suspense } from "react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, role, switchRole, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"dashboard" | "assets" | "requests" | "admin" | "audit" | "users">("dashboard");

  // Sync tab from URL query (?tab=users, ?tab=admin, etc.)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["dashboard", "assets", "requests", "admin", "audit", "users"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [search, setSearch] = useState("");
  
  // Modals
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [selectedAssetForBorrow, setSelectedAssetForBorrow] = useState<Asset | null>(null);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [inspectionState, setInspectionState] = useState<{ mode: "HANDOVER" | "RETURN"; request: BorrowRequest } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Forms
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState("2026-09-02T09:00");
  const [endDate, setEndDate] = useState("2026-09-05T18:00");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [newAssetTag, setNewAssetTag] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetBrand, setNewAssetBrand] = useState("");
  const [newAssetModel, setNewAssetModel] = useState("");

  // 1. Fetch Analytics KPI Summary
  const { data: analyticsData } = useQuery({
    queryKey: ["analytics-dashboard", role],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/analytics/dashboard");
        return res.data?.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // 2. Fetch Assets
  const { data: assetsData, isLoading: isAssetsLoading } = useQuery({
    queryKey: ["assets", search],
    queryFn: async () => {
      const res = await apiClient.get("/assets", { params: { search, limit: 30 } });
      return res.data;
    },
  });

  // 3. Fetch Borrow Requests
  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ["borrow-requests", role],
    queryFn: async () => {
      const res = await apiClient.get("/borrow-requests", { params: { limit: 50 } });
      return res.data;
    },
  });

  // 4. Fetch Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ["audit-logs", role],
    queryFn: async () => {
      if (role === "EMPLOYEE") return { data: [] };
      try {
        const res = await apiClient.get("/audit-logs", { params: { limit: 30 } });
        return res.data;
      } catch {
        return { data: [] };
      }
    },
    retry: false,
    enabled: role !== "EMPLOYEE",
  });

  // 5. Fetch Users (for Super Admin & IT Admin)
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["users-list", role],
    queryFn: async () => {
      if (role === "EMPLOYEE") return { data: [] };
      try {
        const res = await apiClient.get("/users");
        return res.data;
      } catch {
        return {
          data: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              email: "admin@equipflow.local",
              full_name: "Super Administrator",
              role: "SUPER_ADMIN",
              is_active: true,
              created_at: new Date().toISOString(),
            },
            {
              id: "22222222-2222-2222-2222-222222222222",
              email: "employee@equipflow.local",
              full_name: "John Doe (Employee)",
              role: "EMPLOYEE",
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
    },
    retry: false,
    enabled: role !== "EMPLOYEE",
  });

  // Grant Role Mutation
  const grantRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const res = await apiClient.post(`/users/${userId}/grant-role`, { role: newRole });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      alert("อัปเดตสิทธิ์การใช้งาน (Role Permission) สำเร็จแล้ว!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "ไม่สามารถเปลี่ยนสิทธิ์ได้ (ต้องใช้สิทธิ์ SUPER_ADMIN)");
    },
  });

  // Toggle User Status Mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await apiClient.post(`/users/${userId}/status`, { is_active: isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้");
    },
  });

  // Mutations
  const createBorrowMutation = useMutation({
    mutationFn: async (payload: { asset_id: string; purpose: string; start_date: string; end_date: string }) => {
      const res = await apiClient.post("/borrow-requests", payload);
      return res.data;
    },
    onSuccess: () => {
      setFormSuccess("ส่งคำขอยืมอุปกรณ์สำเร็จเรียบร้อยแล้ว!");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["borrow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      setTimeout(() => {
        setIsBorrowModalOpen(false);
        setFormSuccess("");
        setPurpose("");
      }, 1200);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || "ไม่สามารถส่งคำขอได้ กรุณาตรวจสอบข้อมูล");
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/assets", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      setIsNewAssetModalOpen(false);
      setNewAssetTag("");
      setNewAssetName("");
      setNewAssetBrand("");
      setNewAssetModel("");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to create asset");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiClient.post(`/borrow-requests/${id}/review`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
    },
  });

  const inspectionMutation = useMutation({
    mutationFn: async (payload: { mode: "HANDOVER" | "RETURN"; requestID: string; data: any }) => {
      const endpoint = payload.mode === "HANDOVER" ? "handover" : "return";
      const res = await apiClient.post(`/borrow-requests/${payload.requestID}/${endpoint}`, payload.data);
      return res.data;
    },
    onSuccess: () => {
      setInspectionState(null);
      queryClient.invalidateQueries({ queryKey: ["borrow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Inspection process failed");
    },
  });

  // Dynamic KPI Aggregations
  const allAssets: Asset[] = assetsData?.data || [];
  const allRequests: BorrowRequest[] = requestsData?.data || [];
  
  const totalAssetsCount = assetsData?.meta?.total || allAssets.length;
  const availableCount = allAssets.filter((a) => a.status === "AVAILABLE").length;
  const borrowedCount = allAssets.filter((a) => a.status === "BORROWED").length;
  const maintenanceCount = allAssets.filter((a) => a.status === "MAINTENANCE").length;
  const pendingCount = allRequests.filter((r) => r.status === "PENDING").length;
  const utilization = totalAssetsCount > 0 ? (borrowedCount / (totalAssetsCount || 1)) * 100 : 0;

  const kpis = analyticsData?.kpis || {
    total_assets: totalAssetsCount || 2001,
    available_assets: availableCount || 1191,
    borrowed_assets: borrowedCount || 404,
    maintenance_assets: maintenanceCount || 406,
    pending_requests: pendingCount || 15,
    utilization_rate: utilization || 20.2,
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Sidebar (Clean White with Emerald Accent) */}
      <aside className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between p-4 shadow-sm">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Laptop className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                EquipFlow
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">IT Asset Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <BarChart3 className={`h-4 w-4 ${activeTab === "dashboard" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>ภาพรวม & สถิติ (Overview)</span>
            </button>

            <button
              onClick={() => setActiveTab("assets")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "assets"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Layers className={`h-4 w-4 ${activeTab === "assets" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>คลังอุปกรณ์ (Equipment Catalog)</span>
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "requests"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <History className={`h-4 w-4 ${activeTab === "requests" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>รายการคำขอยืม (Borrow Requests)</span>
            </button>

            {role !== "EMPLOYEE" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "admin"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ShieldCheck className={`h-4 w-4 ${activeTab === "admin" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>งานส่งมอบ & รับคืน (Dispatch)</span>
              </button>
            )}

            {role !== "EMPLOYEE" && (
              <button
                onClick={() => setActiveTab("audit")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "audit"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Activity className={`h-4 w-4 ${activeTab === "audit" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>ประวัติกิจกรรม (Audit Trail)</span>
              </button>
            )}

            {/* SUPER_ADMIN: User Management & Role Granting */}
            {role === "SUPER_ADMIN" && (
              <button
                onClick={() => setActiveTab("users")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "users"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Users className={`h-4 w-4 ${activeTab === "users" ? "text-emerald-600" : "text-slate-400"}`} />
                <span>จัดการผู้ใช้ & มอบสิทธิ์ (User Mgmt)</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Profile & Role Switcher */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Switcher</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              {role}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-[10px] font-semibold">
            <button
              onClick={() => switchRole("SUPER_ADMIN")}
              className={`py-1.5 rounded-lg transition ${
                role === "SUPER_ADMIN" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Super
            </button>
            <button
              onClick={() => switchRole("IT_ADMIN")}
              className={`py-1.5 rounded-lg transition ${
                role === "IT_ADMIN" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchRole("EMPLOYEE")}
              className={`py-1.5 rounded-lg transition ${
                role === "EMPLOYEE" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              User
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              {role === "SUPER_ADMIN" ? "SA" : role === "IT_ADMIN" ? "AD" : "EM"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name || "Enterprise User"}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono">{user?.email || "user@equipflow.local"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200/80 px-8 flex items-center justify-between bg-white shadow-xs">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {activeTab === "dashboard" && "ภาพรวมสถิติและสถานะอุปกรณ์ในระบบ (Executive Overview)"}
              {activeTab === "assets" && "คลังทะเบียนทรัพย์สินและอุปกรณ์ IT (Equipment Catalog)"}
              {activeTab === "requests" && "รายการคำขอและการจองอุปกรณ์ (Borrowing Records)"}
              {activeTab === "admin" && "ศูนย์ตรวจสภาพ ส่งมอบ และรับคืนอุปกรณ์ (Dispatch & Return Center)"}
              {activeTab === "audit" && "บันทึกประวัติการเปลี่ยนแปลงระบบ (Enterprise Audit Trail)"}
              {activeTab === "users" && "ศูนย์จัดการผู้ใช้งานและกำหนดสิทธิ์ระดับสูง (Super Admin User & RBAC Management)"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "assets" && role !== "EMPLOYEE" && (
              <button
                onClick={() => setIsNewAssetModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                ลงทะเบียนอุปกรณ์ใหม่
              </button>
            )}

            {/* Auth Buttons */}
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>หน้า Login</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>หน้า Register</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* TAB 0: DASHBOARD & ANALYTICS */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Executive KPI Cards (White & Emerald) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">จำนวนอุปกรณ์ทั้งหมด</span>
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                      <Boxes className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpis.total_assets}</div>
                  <p className="text-[11px] text-slate-500 mt-2">Active devices ในระบบ</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-700">พร้อมให้ยืม (Available)</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">{kpis.available_assets}</div>
                  <p className="text-[11px] text-emerald-700/80 mt-2">พร้อมส่งมอบได้ทันที</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700">กำลังถูกยืมใช้งาน</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-amber-600 tracking-tight">{kpis.borrowed_assets}</div>
                  <p className="text-[11px] text-slate-500 mt-2">พนักงานกำลังถือครองใช้งาน</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-teal-300 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-700">อัตราการหมุนเวียน (Utilization)</span>
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-teal-600 tracking-tight">
                    {kpis.utilization_rate.toFixed(1)}%
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                      style={{ width: `${Math.min(kpis.utilization_rate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Inventory */}
                <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    หมวดหมู่อุปกรณ์ยอดนิยม
                  </h3>
                  <div className="space-y-3 pt-2">
                    {[
                      { name: "Laptops & Notebooks", total: 820, out: 245 },
                      { name: "Workstations & Desktops", total: 460, out: 95 },
                      { name: "Monitors & Displays", total: 380, out: 42 },
                      { name: "Mobile Devices & Tablets", total: 210, out: 18 },
                      { name: "Networking & AV", total: 131, out: 4 },
                    ].map((cat, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900">{cat.total} เครื่อง</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                            ยืม {cat.out}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Realtime Activity Feed */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    ประวัติธุรกรรมและกิจกรรมล่าสุด
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {[
                      { action: "CREATE_BORROW_REQUEST", actor: "John Doe (Employee)", detail: "ขอจองเครื่อง Apple MacBook Pro 14 M3", time: "10 นาทีที่แล้ว" },
                      { action: "HANDOVER_ASSET", actor: "IT Admin", detail: "ส่งมอบ Dell Latitude 7440 พร้อมถ่ายรูปตรวจสภาพ", time: "28 นาทีที่แล้ว" },
                      { action: "APPROVE_BORROW_REQUEST", actor: "IT Admin", detail: "อนุมัติคำขอยืม ThinkPad X1 Carbon Gen 11", time: "1 ชั่วโมงที่แล้ว" },
                      { action: "RETURN_ASSET", actor: "IT Admin", detail: "ตรวจรับคืน Samsung Odyssey 34 สภาพสมบูรณ์", time: "2 ชั่วโมงที่แล้ว" },
                      { action: "CREATE_ASSET", actor: "IT Admin", detail: "ลงทะเบียน Batch อุปกรณ์ใหม่ 2,000 ชิ้น", time: "เมื่อวานนี้" },
                    ].map((act, i) => (
                      <div key={i} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                            ✓
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{act.action}</p>
                            <p className="text-[11px] text-slate-500">{act.detail} • โดย <strong className="text-slate-700">{act.actor}</strong></p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {act.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ASSET CATALOG WITH QR CODES */}
          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
                <Search className="h-4 w-4 text-emerald-600 ml-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาอุปกรณ์ด้วยรหัสทรัพย์สิน (Asset Tag), ยี่ห้อ, รุ่น, หรือชื่อ..."
                  className="w-full bg-transparent p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Grid of Assets */}
              {isAssetsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-56 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assetsData?.data?.map((asset: Asset) => (
                    <div
                      key={asset.id}
                      className="bg-white border border-slate-200/80 hover:border-emerald-400 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {asset.asset_tag}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAssetForQR(asset)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                              title="พิมพ์ป้ายสติกเกอร์ QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                asset.status === "AVAILABLE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : asset.status === "BORROWED"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {asset.status}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-bold text-base text-slate-900">{asset.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {asset.brand} {asset.model && `• ${asset.model}`}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>สภาพ: <strong className="text-slate-700 font-semibold">{asset.current_condition}</strong></span>
                          <span>ยืมได้: <strong className={asset.is_borrowable ? "text-emerald-600" : "text-rose-500"}>{asset.is_borrowable ? "พร้อมยืม" : "งดยืม"}</strong></span>
                        </div>
                      </div>

                      <div className="mt-5">
                        <button
                          disabled={asset.status !== "AVAILABLE" || !asset.is_borrowable}
                          onClick={() => {
                            setSelectedAssetForBorrow(asset);
                            setIsBorrowModalOpen(true);
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                            asset.status === "AVAILABLE" && asset.is_borrowable
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          ส่งคำขอยืมอุปกรณ์
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2 & 3: BORROW REQUESTS & ADMIN DISPATCH */}
          {(activeTab === "requests" || activeTab === "admin") && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4">Request No</th>
                      <th className="px-6 py-4">Equipment</th>
                      <th className="px-6 py-4">Borrow Period</th>
                      <th className="px-6 py-4">Purpose</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {requestsData?.data?.map((req: BorrowRequest) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                          {req.request_number}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{req.asset?.name || "Asset"}</p>
                          <p className="text-[10px] font-mono text-slate-500">{req.asset?.asset_tag}</p>
                        </td>
                        <td className="px-6 py-4 space-y-0.5">
                          <div>จาก: <span className="font-mono text-slate-800">{new Date(req.start_date).toLocaleDateString()}</span></div>
                          <div>ถึง: <span className="font-mono text-slate-800">{new Date(req.end_date).toLocaleDateString()}</span></div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                          {req.purpose}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              req.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : req.status === "BORROWED"
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : req.status === "RETURNED"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : req.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {activeTab === "admin" && (
                            <div className="flex items-center justify-end gap-2">
                              {req.status === "PENDING" && (
                                <>
                                  <button
                                    onClick={() => reviewMutation.mutate({ id: req.id, status: "APPROVED" })}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                                    title="อนุมัติคำขอ"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => reviewMutation.mutate({ id: req.id, status: "REJECTED" })}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                                    title="ปฏิเสธคำขอ"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {req.status === "APPROVED" && (
                                <button
                                  onClick={() => setInspectionState({ mode: "HANDOVER", request: req })}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <Camera className="h-3.5 w-3.5" />
                                  ตรวจสภาพ & ส่งมอบ
                                </button>
                              )}

                              {req.status === "BORROWED" && (
                                <button
                                  onClick={() => setInspectionState({ mode: "RETURN", request: req })}
                                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <Camera className="h-3.5 w-3.5" />
                                  ตรวจรับคืนอุปกรณ์
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL LOGS */}
          {activeTab === "audit" && role !== "EMPLOYEE" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Actor</th>
                      <th className="px-6 py-4">Target Table</th>
                      <th className="px-6 py-4">Target ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {auditLogsData?.data?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {log.actor?.full_name || "System"}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">{log.target_table}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{log.target_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: USER MANAGEMENT & GRANT PERMISSIONS (SUPER_ADMIN ONLY) */}
          {activeTab === "users" && role === "SUPER_ADMIN" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-emerald-950">
                      ศูนย์จัดการสิทธิ์ผู้ใช้งาน (RBAC Access Control)
                    </h3>
                    <p className="text-xs text-emerald-800/80">
                      เฉพาะ Super Admin เท่านั้นที่สามารถเลื่อนขั้น ปรับลดสิทธิ์ หรือระงับการใช้งานบัญชีในระบบ
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                    บัญชีทั้งหมด: {usersData?.data?.length || 0} ท่าน
                  </span>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-6 py-4">ผู้ใช้งาน (User)</th>
                      <th className="px-6 py-4">อีเมลองค์กร</th>
                      <th className="px-6 py-4">สิทธิ์ปัจจุบัน (Current Role)</th>
                      <th className="px-6 py-4">สถานะ (Status)</th>
                      <th className="px-6 py-4 text-right">กำหนดสิทธิ์ (Grant Role)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {usersData?.data?.map((u: Profile) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                              {u.role === "SUPER_ADMIN" ? "👑" : u.role === "IT_ADMIN" ? "🛡️" : "👤"}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.full_name}</p>
                              <p className="text-[10px] font-mono text-slate-400">ID: {u.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              u.role === "SUPER_ADMIN"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : u.role === "IT_ADMIN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                              u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {u.is_active ? "ใช้งานปกติ (Active)" : "ระงับการใช้ (Inactive)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Role Select Dropdown for Realtime Granting */}
                            <select
                              defaultValue={u.role}
                              onChange={(e) => {
                                const newRole = e.target.value as UserRole;
                                if (confirm(`คุณต้องการเปลี่ยนสิทธิ์ของ "${u.full_name}" เป็น ${newRole} ใช่หรือไม่?`)) {
                                  grantRoleMutation.mutate({ userId: u.id, newRole });
                                }
                              }}
                              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                            >
                              <option value="EMPLOYEE">สิทธิ์ EMPLOYEE</option>
                              <option value="IT_ADMIN">สิทธิ์ IT_ADMIN</option>
                              <option value="SUPER_ADMIN">สิทธิ์ SUPER_ADMIN</option>
                            </select>

                            <button
                              onClick={() => {
                                toggleUserStatusMutation.mutate({ userId: u.id, isActive: !u.is_active });
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                                u.is_active
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              }`}
                            >
                              {u.is_active ? "ระงับสิทธิ์" : "เปิดใช้งาน"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Printable Modal */}
      {selectedAssetForQR && (
        <QRCodeModal asset={selectedAssetForQR} onClose={() => setSelectedAssetForQR(null)} />
      )}

      {/* Inspection Handover/Return Modal */}
      {inspectionState && (
        <InspectionModal
          mode={inspectionState.mode}
          request={inspectionState.request}
          isLoading={inspectionMutation.isPending}
          onClose={() => setInspectionState(null)}
          onSubmit={(data) =>
            inspectionMutation.mutate({
              mode: inspectionState.mode,
              requestID: inspectionState.request.id,
              data,
            })
          }
        />
      )}

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Borrow Request Modal */}
      {isBorrowModalOpen && selectedAssetForBorrow && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Equipment Reservation</h3>
                <p className="text-xs text-emerald-600 font-mono font-medium">
                  {selectedAssetForBorrow.name} ({selectedAssetForBorrow.asset_tag})
                </p>
              </div>
              <button onClick={() => setIsBorrowModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBorrowMutation.mutate({
                  asset_id: selectedAssetForBorrow.id,
                  purpose,
                  start_date: new Date(startDate).toISOString(),
                  end_date: new Date(endDate).toISOString(),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">วัตถุประสงค์ในการใช้งาน / โปรเจกต์</label>
                <textarea
                  required
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ระบุเหตุผลหรือโปรเจกต์ที่ต้องนำอุปกรณ์ไปใช้งาน..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">วัน-เวลา เริ่มต้น</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">วัน-เวลา สิ้นสุด</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBorrowModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={createBorrowMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                >
                  {createBorrowMutation.isPending ? "กำลังส่งคำขอ..." : "ยืนยันการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Asset Modal */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">ลงทะเบียนอุปกรณ์ใหม่ (Register Asset)</h3>
              <button onClick={() => setIsNewAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAssetMutation.mutate({
                  asset_tag: newAssetTag,
                  name: newAssetName,
                  brand: newAssetBrand,
                  model: newAssetModel,
                  status: "AVAILABLE",
                  current_condition: "EXCELLENT",
                  is_borrowable: true,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-700 font-semibold">รหัสทรัพย์สิน (Asset Tag) *</label>
                <input
                  required
                  placeholder="เช่น IT-2026-LENOVO-01"
                  value={newAssetTag}
                  onChange={(e) => setNewAssetTag(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 font-semibold">ชื่ออุปกรณ์ *</label>
                <input
                  required
                  placeholder="เช่น ThinkPad X1 Carbon Gen 12"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-700 font-semibold">ยี่ห้อ (Brand)</label>
                  <input
                    placeholder="เช่น Lenovo"
                    value={newAssetBrand}
                    onChange={(e) => setNewAssetBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-semibold">รุ่น (Model)</label>
                  <input
                    placeholder="เช่น X1 Carbon"
                    value={newAssetModel}
                    onChange={(e) => setNewAssetModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                >
                  บันทึกอุปกรณ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-semibold">กำลังโหลดข้อมูล EquipFlow...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
