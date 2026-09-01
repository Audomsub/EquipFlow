"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Category, FormFieldDefinition, ChecklistItemDefinition } from "@/types";
import { Layers, Plus, Trash2, Edit3, X, Check, Sparkles, Box, Car, Laptop, Camera, Wrench } from "lucide-react";

interface CategoryManagerModalProps {
  onClose: () => void;
}

export function CategoryManagerModal({ onClose }: CategoryManagerModalProps) {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("box");
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemDefinition[]>([]);

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery<{ data: Category[] }>({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await apiClient.get("/categories");
      return res.data;
    },
  });

  const categories = categoriesData?.data || [];

  // Reset form
  const startNewCategory = () => {
    setEditingCategory({});
    setName("");
    setDescription("");
    setIcon("box");
    setFormFields([
      { name: "purpose_detail", label: "รายละเอียดวัตถุประสงค์เพิ่มเติม", type: "text", required: false },
    ]);
    setChecklistItems([
      { key: "cosmetic_condition", label: "ตรวจสภาพภายนอก ไร้รอยแตกร้าว", type: "boolean" },
      { key: "accessories_complete", label: "อุปกรณ์เสริมและสายต่อพ่วงครบถ้วน", type: "boolean" },
    ]);
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setIcon(cat.icon || "box");
    setFormFields(cat.required_form_fields || []);
    setChecklistItems(cat.checklist_template || []);
  };

  // Add field
  const addFormField = () => {
    setFormFields([
      ...formFields,
      { name: `field_${Date.now()}`, label: "ระบุชื่อข้อมูลที่ต้องกรอก", type: "text", required: true },
    ]);
  };

  const removeFormField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  // Add checklist item
  const addChecklistItem = () => {
    setChecklistItems([
      ...checklistItems,
      { key: `item_${Date.now()}`, label: "ระบุรายการตรวจสภาพอุปกรณ์", type: "boolean" },
    ]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  // Save mutation
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        icon,
        required_form_fields: formFields,
        checklist_template: checklistItems,
      };

      if (editingCategory?.id) {
        await apiClient.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await apiClient.post("/categories", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingCategory(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to save category");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                จัดการหมวดหมู่อุปกรณ์และแบบฟอร์ม (Category & Dynamic Schema Engine)
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดฟิลด์ข้อมูลที่ต้องกรอกตอนขอยืม และรายการตรวจสภาพ (Checklist) แยกตามประเภททรัพย์สิน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {editingCategory ? (
            /* Category Editor Form */
            <div className="space-y-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">
                  {editingCategory.id ? "แก้ไขหมวดหมู่อุปกรณ์" : "สร้างหมวดหมู่อุปกรณ์ใหม่"}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  ย้อนกลับ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น รถยนต์และยานพาหนะ, เครื่องมือช่าง"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">คำอธิบายย่อ</label>
                  <input
                    type="text"
                    placeholder="รายละเอียดอุปกรณ์ในหมวดหมู่นี้..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Form Fields Configurator */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">ฟิลด์ข้อมูลที่ต้องกรอกตอนขอยืม (Dynamic Borrow Form Fields)</h5>
                    <p className="text-[11px] text-slate-500">พนักงานจะต้องกรอกข้อมูลเหล่านี้เมื่อทำการยืมอุปกรณ์ในหมวดหมู่นี้</p>
                  </div>
                  <button
                    type="button"
                    onClick={addFormField}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มฟิลด์</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[idx].label = e.target.value;
                          setFormFields(updated);
                        }}
                        placeholder="ชื่อฟิลด์ภาษาไทย เช่น เลขที่ใบขับขี่"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...formFields];
                          updated[idx].type = e.target.value as any;
                          setFormFields(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700"
                      >
                        <option value="text">ข้อความ (Text)</option>
                        <option value="number">ตัวเลข (Number)</option>
                        <option value="checkbox">เช็คบ็อกซ์ (Checkbox)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFormField(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Checklist Template Configurator */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">รายการตรวจสภาพ (Inspection Checklist Template)</h5>
                    <p className="text-[11px] text-slate-500">ใช้ตรวจรับสภาพตอนส่งมอบและตรวจรับคืนอุปกรณ์</p>
                  </div>
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มรายการตรวจ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const updated = [...checklistItems];
                          updated[idx].label = e.target.value;
                          setChecklistItems(updated);
                        }}
                        placeholder="รายการตรวจ เช่น หน้าเลนส์สะอาด, ระดับน้ำมัน"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800"
                      />
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const updated = [...checklistItems];
                          updated[idx].type = e.target.value as any;
                          setChecklistItems(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700"
                      >
                        <option value="boolean">ผ่าน/ไม่ผ่าน (Pass/Fail)</option>
                        <option value="number">ตัวเลข (Number/Reading)</option>
                        <option value="text">ข้อความ (Notes)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={saveCategoryMutation.isPending || !name.trim()}
                  onClick={() => saveCategoryMutation.mutate()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                >
                  {saveCategoryMutation.isPending ? "กำลังบันทึก..." : "บันทึกหมวดหมู่"}
                </button>
              </div>
            </div>
          ) : (
            /* Category List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">หมวดหมู่ทั้งหมดในระบบ ({categories.length} หมวดหมู่):</p>
                <button
                  type="button"
                  onClick={startNewCategory}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>สร้างหมวดหมู่ใหม่</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {cat.icon === "car" ? <Car className="h-5 w-5" /> : cat.icon === "camera" ? <Camera className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{cat.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{cat.description || "ไม่มีคำอธิบาย"}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditCategory(cat)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                        title="แก้ไขหมวดหมู่และสคีมา"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Metadata Summary */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                        📋 {cat.required_form_fields?.length || 0} ฟิลด์ขอยืม
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        ✅ {cat.checklist_template?.length || 0} หัวข้อตรวจสภาพ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
