"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatar } from "@/lib/profile/actions";
import { useDictionary } from "@/lib/i18n/locale-provider";

const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 512;

/** Center-crop to square + downscale — avatars are always shown as circles,
 * no reason to upload/store an arbitrary-aspect-ratio original. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      "image/jpeg",
      0.85
    );
  });
}

export function AvatarUpload({
  name,
  initialAvatarUrl,
}: {
  name: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = (name || "?").charAt(0).toUpperCase();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(dict.errors.avatarNotImage);
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      toast.error(dict.errors.avatarTooLarge);
      return;
    }

    setUploading(true);
    try {
      const blob = await toSquareJpeg(file);
      const formData = new FormData();
      formData.set("file", blob, "avatar.jpg");

      const result = await uploadAvatar(formData);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      setAvatarUrl(result.data.avatarUrl);
      toast.success(dict.toasts.avatarUpdated);
      router.refresh();
    } catch (e) {
      console.error("[AvatarUpload] upload failed", e);
      toast.error(dict.errors.avatarUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={dict.settings.changeAvatar}
        className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Avatar size="xl">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
        </span>
      </button>

      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{dict.settings.avatarLabel}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-accent-foreground hover:underline self-start disabled:opacity-60"
        >
          {uploading ? dict.settings.uploading : dict.settings.changeAvatar}
        </button>
      </div>
    </div>
  );
}
