"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useDictionary } from "@/lib/i18n/locale-provider";

export function ImageLightbox({
  url,
  open,
  onOpenChange,
}: {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dict = useDictionary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-1 bg-transparent ring-0 shadow-none">
        <DialogTitle className="sr-only">{dict.chat.imageAlt}</DialogTitle>
        {url && (
          /* eslint-disable-next-line @next/next/no-img-element -- transient
             signed URL for a private chat attachment, never a servable
             local asset next/image could optimize */
          <img src={url} alt={dict.chat.imageAlt} className="w-full max-h-[85vh] object-contain rounded-xl" />
        )}
      </DialogContent>
    </Dialog>
  );
}
