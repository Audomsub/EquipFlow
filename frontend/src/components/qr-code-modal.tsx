"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X } from "lucide-react";
import { Asset } from "@/types";

interface QRCodeModalProps {
  asset: Asset;
  onClose: () => void;
}

export function QRCodeModal({ asset, onClose }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrValue = `EQUIPFLOW:ASSET:${asset.id}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-800 tracking-wide uppercase">Asset Tag Label</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Label Card (Clean White & Emerald) */}
        <div 
          ref={qrRef}
          className="bg-slate-50 text-slate-950 p-6 rounded-2xl border-2 border-dashed border-emerald-300 flex flex-col items-center text-center shadow-sm"
        >
          <div className="text-[10px] font-black tracking-widest uppercase text-emerald-700 mb-2">
            EquipFlow Enterprise IT
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm mb-3">
            <QRCodeSVG 
              value={qrValue} 
              size={160}
              level="H"
              includeMargin={false}
              fgColor="#047857"
            />
          </div>

          <div className="font-mono text-sm font-extrabold tracking-wider text-slate-900">
            {asset.asset_tag}
          </div>
          <div className="text-xs font-semibold text-slate-700 truncate max-w-[200px] mt-0.5">
            {asset.name}
          </div>
          {asset.brand && (
            <div className="text-[10px] text-slate-500 uppercase mt-0.5">
              {asset.brand} {asset.model && `• ${asset.model}`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 text-center transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
          >
            <Printer className="h-4 w-4" />
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
