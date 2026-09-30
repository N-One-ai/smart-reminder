"use client";

import { subscribePush, unsubscribePush } from "@/lib/push/actions";
import { useDictionary } from "@/lib/i18n/locale-provider";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0)).buffer;
}

function toSubscriptionInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid PushSubscription — missing endpoint or keys");
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

/**
 * Subscribes this browser to Web Push. Requires an already-registered service
 * worker (production builds only — see service-worker-register.tsx) and an
 * already-granted Notification permission; callers are expected to request
 * that first (see notification-permission-banner.tsx), since pushManager
 * .subscribe() with userVisibleOnly:true silently relies on it.
 */
export function usePushSubscription() {
  const dict = useDictionary();

  async function isSupported(): Promise<boolean> {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    );
  }

  async function subscribe(): Promise<{ ok: boolean; error?: string }> {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return { ok: false, error: dict.errors.pushMissingConfig };

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const result = await subscribePush(toSubscriptionInput(subscription));
      if (!result.ok) return { ok: false, error: result.error.message };
      return { ok: true };
    } catch (e) {
      console.error("[usePushSubscription] subscribe failed", e);
      return { ok: false, error: dict.errors.pushEnableFailed };
    }
  }

  async function unsubscribe(): Promise<{ ok: boolean; error?: string }> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return { ok: true };

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const result = await unsubscribePush(endpoint);
      if (!result.ok) return { ok: false, error: result.error.message };
      return { ok: true };
    } catch (e) {
      console.error("[usePushSubscription] unsubscribe failed", e);
      return { ok: false, error: dict.errors.pushDisableFailed };
    }
  }

  return { isSupported, subscribe, unsubscribe };
}
