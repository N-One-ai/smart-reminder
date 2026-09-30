"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Camera, Images, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDictionary } from "@/lib/i18n/locale-provider";

const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024; // 20MB — guard before we ever touch the canvas
const COMPRESS_MAX_DIMENSION = 1600;
const COMPRESS_QUALITY = 0.8;

interface CapturedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  source: "camera" | "library";
}

async function compressImage(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
    const scale = COMPRESS_MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", COMPRESS_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { dataUrl, base64, mimeType: "image/jpeg" };
}

/**
 * Full-screen "Scan ảnh" capture flow — same role as VoiceInputScreen: its
 * only job is turning a camera shot / library pick into (base64, mimeType)
 * and handing that off to the parent, which then runs the exact same
 * parse → preview/clarify → confirm pipeline already used for text and voice.
 */
export function ImageScanScreen({
  onAnalyze,
  onCancel,
}: {
  onAnalyze: (base64: string, mimeType: string) => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const [captured, setCaptured] = useState<CapturedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined, source: "camera" | "library") {
    if (!file) return;
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      toast.error(dict.scanScreen.tooLarge);
      return;
    }

    setIsProcessing(true);
    try {
      const { dataUrl, base64, mimeType } = await compressImage(file);
      setCaptured({ dataUrl, base64, mimeType, source });
    } catch (e) {
      console.error("[ImageScanScreen] compress failed", e);
      toast.error(dict.scanScreen.processFailed);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleConfirm() {
    if (!captured) return;
    onAnalyze(captured.base64, captured.mimeType);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0], "camera");
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0], "library");
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={onCancel}
          aria-label={dict.scanScreen.back}
          className="flex size-9 items-center justify-center rounded-full hover:bg-muted text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="font-heading text-base font-bold">{dict.scanScreen.title}</p>
      </div>

      {captured ? (
        <div className="flex-1 flex flex-col px-6 pb-8 gap-5 min-h-0">
          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- transient client-side preview of a locally compressed capture, never a served asset */}
            <img src={captured.dataUrl} alt={dict.scanScreen.selectedImageAlt} className="max-w-full max-h-full object-contain" />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCaptured(null)}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-muted text-muted-foreground text-sm font-medium"
            >
              <RefreshCw className="size-4" />
              {captured.source === "camera" ? dict.scanScreen.retake : dict.scanScreen.chooseAnother}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              <Sparkles className="size-4" />
              {dict.scanScreen.analyze}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => cameraInputRef.current?.click()}
            className="w-full max-w-xs flex items-center justify-center gap-2.5 h-14 rounded-full bg-primary text-primary-foreground font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {isProcessing ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            {dict.scanScreen.takePhoto}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => libraryInputRef.current?.click()}
            className="w-full max-w-xs flex items-center justify-center gap-2.5 h-14 rounded-full bg-muted text-foreground font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <Images className="size-5" />
            {dict.scanScreen.chooseFromLibrary}
          </button>
          <p className="text-xs text-muted-foreground text-center max-w-xs pt-2">
            {dict.scanScreen.hint}
          </p>
        </div>
      )}
    </div>
  );
}
