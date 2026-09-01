"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, X, QrCode, AlertCircle, CheckCircle2, RefreshCw, Zap } from "lucide-react";

interface CameraQRScannerModalProps {
  onScan: (scannedText: string) => void;
  onClose: () => void;
  title?: string;
}

export function CameraQRScannerModal({ onScan, onClose, title = "สแกน QR Code / Asset Tag" }: CameraQRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [manualInput, setManualInput] = useState<string>("");
  const [scannedResult, setScannedResult] = useState<string>("");

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องผ่าน Web API");
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } catch (err: any) {
        console.warn("Camera access warning:", err);
        setCameraError("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาต Camera Permission หรือพิมพ์รหัสด้วยตนเอง");
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cleanTag = manualInput.trim();
    setScannedResult(cleanTag);
    setTimeout(() => {
      onScan(cleanTag);
      onClose();
    }, 400);
  };

  const handleSimulateScan = (tag: string) => {
    setScannedResult(tag);
    setTimeout(() => {
      onScan(tag);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">สแกนรหัสอุปกรณ์เพื่อค้นหาและตรวจสอบทันที</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-emerald-500/40 shadow-inner">
          {cameraError ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-400" />
              <p className="text-xs font-semibold text-slate-300">กล้องไม่พร้อมใช้งาน</p>
              <p className="text-[11px] text-slate-400 max-w-xs">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan Overlay Crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-0.5 -ml-0.5"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-0.5 -mr-0.5"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-0.5 -ml-0.5"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-0.5 -mr-0.5"></div>
                  {/* Laser Scan Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                </div>
              </div>
            </>
          )}

          {/* Scanned Badge */}
          {scannedResult && (
            <div className="absolute bottom-3 bg-emerald-600/90 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-xs">
              <CheckCircle2 className="h-4 w-4" />
              <span>ตรวจพบ: {scannedResult}</span>
            </div>
          )}
        </div>

        {/* Manual Barcode / Asset Tag Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <QrCode className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="หรือพิมพ์ Asset Tag เช่น IT-2026-00001..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {/* Quick Scan Simulator for Testing */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-semibold mb-1.5">⚡ ทดสอบสแกนด่วน (Quick Scan Sample):</p>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => handleSimulateScan("IT-2026-00001")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-mono transition cursor-pointer"
            >
              Tag: IT-2026-00001
            </button>
            <button
              type="button"
              onClick={() => handleSimulateScan("IT-2026-00002")}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-mono transition cursor-pointer"
            >
              Tag: IT-2026-00002
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
