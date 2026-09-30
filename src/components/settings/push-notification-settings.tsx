"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useDictionary } from "@/lib/i18n/locale-provider";

type Status = "checking" | "unsupported" | "denied" | "subscribed" | "not-subscribed";

export function PushNotificationSettings() {
  const dict = useDictionary();
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
          toast.error(result.error ?? dict.errors.pushDisableFailed);
          return;
        }
        setStatus("not-subscribed");
        toast.success(dict.toasts.pushDisabled);
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
        toast.error(result.error ?? dict.errors.pushEnableFailed);
        return;
      }
      setStatus("subscribed");
      toast.success(dict.toasts.pushEnabled);
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{dict.settings.pushNotifications}</p>
        <p className="text-xs text-muted-foreground">
          {dict.settings.pushUnsupported}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{dict.settings.pushNotifications}</p>
        <p className="text-xs text-muted-foreground">
          {status === "denied"
            ? dict.settings.pushDenied
            : status === "subscribed"
              ? dict.settings.pushSubscribed
              : dict.settings.pushNotSubscribed}
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
        {status === "subscribed" ? dict.settings.pushOff : dict.settings.pushOn}
      </Button>
    </div>
  );
}
