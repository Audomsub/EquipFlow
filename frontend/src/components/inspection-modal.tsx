"use client";

import React, { useState } from "react";
import { X, Camera, AlertTriangle, CheckSquare, Sparkles } from "lucide-react";
import { BorrowRequest, ConditionStatus, ChecklistItemDefinition } from "@/types";
import { supabase } from "@/lib/supabase";

interface InspectionModalProps {
  mode: "HANDOVER" | "RETURN";
  request: BorrowRequest;
  onClose: () => void;
  onSubmit: (payload: {
    condition: ConditionStatus;
    notes: string;
    photos: string[];
    checklist_results?: Record<string, any>;
    is_damaged?: boolean;
    damage_fine_amount?: number;
  }) => void;
  isLoading: boolean;
}

export function InspectionModal({ mode, request, onClose, onSubmit, isLoading }: InspectionModalProps) {
  const [condition, setCondition] = useState<ConditionStatus>("EXCELLENT");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageFine, setDamageFine] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Dynamic Checklist Items from Category
  const checklistTemplate: ChecklistItemDefinition[] = request.asset?.category?.checklist_template || [
    { key: "cosmetic_check", label: "ตรวจสภาพภายนอก ไร้รอยแตกร้าว", type: "boolean" },
    { key: "power_adapter", label: "สายชาร์จและอุปกรณ์เสริมครบ", type: "boolean" },
  ];

  const [checklistValues, setChecklistValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    checklistTemplate.forEach((item) => {
      if (item.type === "boolean") initial[item.key] = true;
      else if (item.type === "number") initial[item.key] = 0;
      else initial[item.key] = "";
    });
    return initial;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${mode.toLowerCase()}-${request.id}-${Date.now()}.${fileExt}`;
    const filePath = `inspections/${fileName}`;

    setUploading(true);
    try {
      const { data, error } = await supabase.storage.from("transactions").upload(filePath, file);
      if (error) {
        const publicUrl = `https://aqvlduohmgnxlwocmsde.supabase.co/storage/v1/object/public/transactions/${filePath}`;
        setPhotos((prev) => [...prev, publicUrl]);
      } else {
        const { data: publicUrlData } = supabase.storage.from("transactions").getPublicUrl(filePath);
        setPhotos((prev) => [...prev, publicUrlData.publicUrl]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      condition,
      notes,
      photos,
      checklist_results: checklistValues,
      is_damaged: isDamaged,
      damage_fine_amount: damageFine,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              {mode === "HANDOVER" ? "ส่งมอบอุปกรณ์และตรวจสภาพ (Equipment Handover)" : "ตรวจรับคืนอุปกรณ์ (Equipment Return & Fine Assessment)"}
            </h3>
            <p className="text-xs text-emerald-600 font-mono font-bold mt-0.5">
              {request.request_number} • {request.asset?.name} ({request.asset?.category?.name || "IT Asset"})
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Condition Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ระดับสภาพอุปกรณ์ (Equipment Condition Status)
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ConditionStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="EXCELLENT">EXCELLENT (สภาพสมบูรณ์เหมือนใหม่)</option>
              <option value="GOOD">GOOD (สภาพดี ใช้งานปกติ)</option>
              <option value="FAIR">FAIR (มีรอยขีดข่วนเล็กน้อย แต่ใช้งานได้ปกติ)</option>
              <option value="DAMAGED">DAMAGED (ชำรุดเสียหาย อุปกรณ์แตกหัก)</option>
              <option value="BROKEN">BROKEN (เสียหายหนัก ใช้งานไม่ได้ ต้องส่งซ่อม)</option>
            </select>
          </div>

          {/* Dynamic Checklist Results */}
          {checklistTemplate.length > 0 && (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <span>รายการตรวจสภาพตามประเภทหมวดหมู่ (Inspection Checklist)</span>
              </h4>
              <div className="space-y-2.5 pt-1">
                {checklistTemplate.map((item) => (
                  <div key={item.key} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                    {item.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={checklistValues[item.key] ?? true}
                        onChange={(e) =>
                          setChecklistValues({ ...checklistValues, [item.key]: e.target.checked })
                        }
                        className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                      />
                    ) : item.type === "number" ? (
                      <input
                        type="number"
                        value={checklistValues[item.key] ?? ""}
                        onChange={(e) =>
                          setChecklistValues({ ...checklistValues, [item.key]: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="ระบุตัวเลข..."
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 text-right"
                      />
                    ) : (
                      <input
                        type="text"
                        value={checklistValues[item.key] ?? ""}
                        onChange={(e) =>
                          setChecklistValues({ ...checklistValues, [item.key]: e.target.value })
                        }
                        placeholder="ระบุข้อความ..."
                        className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              หมายเหตุการตรวจสภาพ / อุปกรณ์เสริมที่ส่งมอบ
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น สายชาร์จแท้สภาพดี, กระเป๋าใส่เครื่อง, สภาพแบตเตอรี่เต็ม..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Photo Upload for Handover / Return */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รูปถ่ายสภาพอุปกรณ์ (บันทึกลง Supabase Storage)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl cursor-pointer transition border border-emerald-200">
                <Camera className="h-4 w-4 text-emerald-600" />
                <span>{uploading ? "กำลังอัปโหลด..." : "ถ่ายรูป / เลือกภาพ"}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <span className="text-[11px] text-slate-500">
                {photos.length} รูปถ่ายแนบแล้ว
              </span>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto py-1">
                {photos.map((url, i) => (
                  <div key={i} className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative group shadow-xs">
                    <img src={url} alt="inspection" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Mode: Damage Assessment & Fine Calculator */}
          {mode === "RETURN" && (
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  พบอุปกรณ์ชำรุดเสียหายหรือไม่? (Damage Found)
                </span>
                <input
                  type="checkbox"
                  checked={isDamaged}
                  onChange={(e) => setIsDamaged(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
              </div>

              {isDamaged && (
                <div className="pt-2 border-t border-amber-200/60">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    คำนวณค่าปรับความเสียหาย (บาท):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={damageFine}
                    onChange={(e) => setDamageFine(parseFloat(e.target.value) || 0)}
                    placeholder="ระบุจำนวนเงินค่าปรับ เช่น 500"
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">ระบบจะบันทึกค่าปรับลงใบเสร็จรับคืนและรายงานไปยังผู้ใช้งาน</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isLoading ? "กำลังบันทึก..." : mode === "HANDOVER" ? "ยืนยันการส่งมอบ" : "เสร็จสิ้นการตรวจรับคืน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
