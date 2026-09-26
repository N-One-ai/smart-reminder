"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "not-subscribed";

export function PushNotificationSettings() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const { isSupported, subscribe, unsubscribe } = usePushSubscription();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supported = await isSupported();
      if (!supported) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setStatus(subscription ? "subscribed" : "not-subscribed");
    }

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSupported/subscribe/unsubscribe are stable closures from the hook, re-running per-render buys nothing
  }, []);

  async function handleToggle() {
    setBusy(true);
    try {
      if (status === "subscribed") {
        const result = await unsubscribe();
        if (!result.ok) {
          toast.error(result.error ?? "Không thể tắt thông báo đẩy");
          return;
        }
        setStatus("not-subscribed");
        toast.success("Đã tắt thông báo đẩy");
        return;
      }

      const permission =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const result = await subscribe();
      if (!result.ok) {
        toast.error(result.error ?? "Không thể bật thông báo đẩy");
        return;
      }
      setStatus("subscribed");
      toast.success("Đã bật thông báo đẩy");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Thông báo đẩy</p>
        <p className="text-xs text-muted-foreground">
          Trình duyệt này chưa hỗ trợ thông báo đẩy.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Thông báo đẩy</p>
        <p className="text-xs text-muted-foreground">
          {status === "denied"
            ? "Bạn đã chặn quyền thông báo — cần bật lại trong cài đặt trình duyệt."
            : status === "subscribed"
              ? "Đang bật — Smart Reminder sẽ nhắc bạn kể cả khi không mở app."
              : "Nhận nhắc nhở kể cả khi không mở app."}
        </p>
      </div>
      <Button
        size="sm"
        variant={status === "subscribed" ? "outline" : "default"}
        onClick={handleToggle}
        disabled={busy || status === "denied"}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : status === "subscribed" ? (
          <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {status === "subscribed" ? "Tắt" : "Bật"}
      </Button>
    </div>
  );
}
