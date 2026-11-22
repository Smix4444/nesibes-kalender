"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

/** Het (nog niet getypeerde) Chrome-event om de installatieprompt te tonen. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

const STANDALONE_QUERY = "(display-mode: standalone)";

/**
 * Platform en installatiestatus zijn browser-state, geen render-state: ze via
 * useSyncExternalStore lezen voorkomt een hydration-mismatch zonder setState
 * in een effect.
 */
function subscribeInstalled(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function getInstalled(): boolean {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ doet zich voor als Mac, vandaar de touch-check.
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  return /Android/.test(ua) ? "android" : "desktop";
}

const noopSubscribe = () => () => {};

export function InstallGuide() {
  // Op de server renderen we de desktop-variant; de client corrigeert direct.
  const platform = useSyncExternalStore(noopSubscribe, getPlatform, () => "desktop" as Platform);
  const installed = useSyncExternalStore(subscribeInstalled, getInstalled, () => false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // setState in een event-callback mag wel: dit volgt externe state.
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <Card className="border-success/40 bg-success/10">
        <CardContent className="flex items-center gap-3 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <div>
            <p className="font-heading font-bold">Gelukt! 🎉</p>
            <p className="text-sm text-muted-foreground">
              {APP_NAME} draait als app. Zet nu meldingen aan bij Instellingen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (platform === "ios") {
    return (
      <Steps
        title="Op je iPhone 📱"
        note="Let op: meldingen werken op iPhone alleen als de app op je beginscherm staat."
        steps={[
          <>
            Open deze pagina in <strong>Safari</strong> (niet in Chrome of Instagram).
          </>,
          <>
            Tik onderaan op het deel-icoon <Share className="inline size-4 align-text-bottom" />.
          </>,
          <>
            Scroll naar <strong>&ldquo;Zet op beginscherm&rdquo;</strong>{" "}
            <SquarePlus className="inline size-4 align-text-bottom" /> en tik op{" "}
            <strong>Voeg toe</strong>.
          </>,
          <>
            Open {APP_NAME} vanaf je beginscherm en zet <strong>meldingen</strong> aan.
          </>,
        ]}
      />
    );
  }

  if (platform === "android") {
    return (
      <div className="space-y-4">
        {promptEvent ? (
          <Button
            size="lg"
            className="h-12 w-full text-base"
            onClick={async () => {
              await promptEvent.prompt();
              await promptEvent.userChoice;
              setPromptEvent(null);
            }}
          >
            📲 Installeer {APP_NAME}
          </Button>
        ) : null}
        <Steps
          title="Op Android 🤖"
          note={
            promptEvent
              ? undefined
              : "Zie je geen knop? Gebruik dan het menu van Chrome."
          }
          steps={[
            <>
              Open het menu <strong>⋮</strong> rechtsboven in Chrome.
            </>,
            <>
              Tik op <strong>&ldquo;App installeren&rdquo;</strong> of{" "}
              <strong>&ldquo;Toevoegen aan startscherm&rdquo;</strong>.
            </>,
            <>
              Open {APP_NAME} vanaf je startscherm en zet <strong>meldingen</strong> aan.
            </>,
          ]}
        />
      </div>
    );
  }

  return (
    <Steps
      title="Op je computer 💻"
      note={`${APP_NAME} is gemaakt voor je telefoon. Open deze pagina daar voor het echte werk.`}
      steps={[
        <>
          Klik op het installatie-icoon in de adresbalk van Chrome of Edge.
        </>,
        <>
          Of open deze pagina op je telefoon om hem op je beginscherm te zetten.
        </>,
      ]}
    />
  );
}

function Steps({
  title,
  steps,
  note,
}: {
  title: string;
  steps: React.ReactNode[];
  note?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <h2 className="font-heading text-lg font-extrabold">{title}</h2>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cig text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5 text-foreground">{step}</span>
            </li>
          ))}
        </ol>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
