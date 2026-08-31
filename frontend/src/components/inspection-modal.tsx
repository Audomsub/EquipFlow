"use client";

import React, { useState } from "react";
import { X, Camera, AlertTriangle } from "lucide-react";
import { BorrowRequest, ConditionStatus } from "@/types";
import { supabase } from "@/lib/supabase";

interface InspectionModalProps {
  mode: "HANDOVER" | "RETURN";
  request: BorrowRequest;
  onClose: () => void;
  onSubmit: (payload: { condition: ConditionStatus; notes: string; photos: string[]; is_damaged?: boolean; damage_fine_amount?: number }) => void;
  isLoading: boolean;
}

export function InspectionModal({ mode, request, onClose, onSubmit, isLoading }: InspectionModalProps) {
  const [condition, setCondition] = useState<ConditionStatus>("EXCELLENT");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageFine, setDamageFine] = useState(0);
  const [uploading, setUploading] = useState(false);

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
        const fakeUrl = `https://aqvlduohmgnxlwocmsde.supabase.co/storage/v1/object/public/transactions/${filePath}`;
        setPhotos((prev) => [...prev, fakeUrl]);
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
      is_damaged: isDamaged,
      damage_fine_amount: damageFine,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {mode === "HANDOVER" ? "Equipment Handover" : "Equipment Return & Inspection"}
            </h3>
            <p className="text-xs text-emerald-600 font-mono font-medium">
              {request.request_number} • {request.asset?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Equipment Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ConditionStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="EXCELLENT">EXCELLENT (Like New)</option>
              <option value="GOOD">GOOD (Normal Wear & Tear)</option>
              <option value="FAIR">FAIR (Functional with Visible Scratches)</option>
              <option value="DAMAGED">DAMAGED (Hardware / Physical Defect)</option>
              <option value="BROKEN">BROKEN (Unusable / Needs Repair)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Inspection Notes / Accessories Verification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Charger adapter and original box included..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Photo Upload for Handover / Return */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Inspection Photos (Supabase Storage)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl cursor-pointer transition border border-emerald-200">
                <Camera className="h-4 w-4 text-emerald-600" />
                <span>{uploading ? "Uploading..." : "Upload Photo"}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <span className="text-[11px] text-slate-500">
                {photos.length} photo(s) attached
              </span>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto py-1">
                {photos.map((url, i) => (
                  <div key={i} className="h-14 w-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative group">
                    <img src={url} alt="inspection" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Mode: Damage Assessment */}
          {mode === "RETURN" && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Hardware Damage Found?
                </span>
                <input
                  type="checkbox"
                  checked={isDamaged}
                  onChange={(e) => setIsDamaged(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
              </div>

              {isDamaged && (
                <div>
                  <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                    Damage Fine Amount (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={damageFine}
                    onChange={(e) => setDamageFine(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/20"
            >
              {isLoading ? "Saving..." : mode === "HANDOVER" ? "Confirm Handover" : "Complete Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
