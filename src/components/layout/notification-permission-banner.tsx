"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const DISMISS_KEY = "smart-reminder:notif-banner-dismissed";

export function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const { subscribe } = usePushSubscription();

  // Notification.permission and localStorage are browser-only — this can't be
  // known during SSR, so it's read after mount rather than at render time.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser-only Notification/localStorage APIs, see comment above
    setVisible(Notification.permission === "default" && !dismissed);
  }, []);

  if (!visible) return null;

  async function handleEnable() {
    const permission = await Notification.requestPermission();
    if (permission !== "default") setVisible(false);
    if (permission !== "granted") return;

    // Best-effort: push subscription needs a registered service worker, which
    // only exists in production builds (see service-worker-register.tsx) — in
    // dev this silently no-ops and the foreground polling notifications
    // (useNotifications) still work.
    const result = await subscribe();
    if (!result.ok && result.error) {
      console.warn("[NotificationPermissionBanner] push subscribe skipped:", result.error);
      return;
    }
    if (result.ok) {
      toast.success("Đã bật thông báo đẩy — Rymi sẽ nhắc bạn kể cả khi không mở app");
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <Bell className="size-4 text-accent-foreground shrink-0" />
      <p className="flex-1 text-sm">
        Bật thông báo để Rymi nhắc bạn đúng giờ khi app đang mở.
      </p>
      <Button size="sm" onClick={handleEnable}>
        Bật thông báo
      </Button>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-md hover:bg-muted text-muted-foreground shrink-0"
        aria-label="Đóng"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
