import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing VAPID env vars (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * Sends one push message to one subscription. Returns whether the endpoint is
 * now dead (410 Gone / 404 Not Found — browser unsubscribed it, e.g. user
 * cleared site data) so the caller can prune it from push_subscriptions
 * instead of retrying it forever.
 */
export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) {
      console.error("[sendPush] failed", subscription.endpoint, e);
    }
    return { ok: false, expired };
  }
}
