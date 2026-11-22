"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeDisplayMode(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getEnvironment(): "ready" | "ios-needs-install" | "unsupported" {
  const standalone =
    window.matchMedia(STANDALONE_QUERY).matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  // Op iPhone werkt web-push alleen vanaf het beginscherm (iOS 16.4+).
  if (isIos && !standalone) return "ios-needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return "ready";
}

/** base64url (VAPID) naar de Uint8Array die pushManager verwacht. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  // Expliciet een ArrayBuffer, want pushManager accepteert geen SharedArrayBuffer.
  const view = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function EnablePushButton() {
  const environment = useSyncExternalStore(
    subscribeDisplayMode,
    getEnvironment,
    () => "unsupported" as const,
  );
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (environment === "ios-needs-install") {
    return (
      <Button nativeButton={false} render={<Link href="/install" />} variant="outline" className="h-12 w-full">
        📲 Zet eerst op je beginscherm
      </Button>
    );
  }

  if (environment === "unsupported") {
    return (
      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        Deze browser kan geen meldingen sturen. Probeer het op je telefoon.
      </p>
    );
  }

  if (done) {
    return (
      <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-semibold text-success">
        🔔 Meldingen staan aan!
      </p>
    );
  }

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Je hebt meldingen geweigerd. Zet ze aan in je browserinstellingen.");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        toast.error("Push is nog niet geconfigureerd (VAPID-sleutel ontbreekt)");
        return;
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error(await response.text());

      setDone(true);
      toast.success("Meldingen staan aan 🔔");
    } catch (error) {
      console.error(error);
      toast.error("Meldingen aanzetten lukte niet");
    }
  }

  return (
    <Button
      className="h-12 w-full font-bold"
      disabled={pending}
      onClick={() => startTransition(enable)}
    >
      <BellRing className="size-4" /> Zet meldingen aan
    </Button>
  );
}
