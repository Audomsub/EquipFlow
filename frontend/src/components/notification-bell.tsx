"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Notification } from "@/types";
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, Sparkles, X } from "lucide-react";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifsData } = useQuery<{ data: Notification[] }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/notifications");
        return res.data;
      } catch {
        return { data: [] };
      }
    },
    refetchInterval: 10000, // Poll every 10 seconds for realtime updates
  });

  const notifications = notifsData?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
        title="การแจ้งเตือน"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>การแจ้งเตือน</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-extrabold">
                    {unreadCount} ใหม่
                  </span>
                )}
              </h4>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                <Bell className="h-6 w-6 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="font-semibold text-slate-500">ไม่มีการแจ้งเตือน</p>
                <p className="text-[11px]">เมื่อมีรายการคำขอหรืออัปเดต จะแสดงที่นี่</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsReadMutation.mutate(n.id);
                  }}
                  className={`p-3.5 px-4 transition flex gap-3 items-start cursor-pointer ${
                    n.is_read ? "bg-white hover:bg-slate-50/60 opacity-80" : "bg-emerald-50/40 hover:bg-emerald-50/70"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                      n.type === "SUCCESS"
                        ? "bg-emerald-100 text-emerald-700"
                        : n.type === "ALERT"
                        ? "bg-rose-100 text-rose-700"
                        : n.type === "WARNING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {n.type === "SUCCESS" && <Check className="h-3.5 w-3.5" />}
                    {n.type === "ALERT" && <AlertCircle className="h-3.5 w-3.5" />}
                    {n.type === "WARNING" && <AlertTriangle className="h-3.5 w-3.5" />}
                    {n.type === "INFO" && <Info className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${n.is_read ? "text-slate-800" : "text-emerald-950"}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 ml-2"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {new Date(n.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
