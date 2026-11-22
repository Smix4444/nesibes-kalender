import "server-only";

import * as webpush from "web-push";

let configured = false;

/** VAPID-sleutels eenmalig instellen; de keys komen uit de omgeving. */
export function getWebPush() {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

    if (!publicKey || !privateKey) {
      throw new Error("VAPID-sleutels ontbreken (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return webpush;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};
