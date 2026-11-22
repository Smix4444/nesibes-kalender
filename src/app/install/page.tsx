import Link from "next/link";
import type { Metadata } from "next";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Installeren" };

export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-safe pb-10">
      <div className="space-y-2 pt-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="mx-auto size-20 rounded-2xl shadow-lg" />
        <h1 className="font-heading text-2xl font-extrabold">
          Zet {APP_NAME} op je beginscherm
        </h1>
        <p className="text-sm text-muted-foreground">
          Zo opent de app zonder adresbalk én kan je meldingen krijgen wanneer
          Nesibe ja zegt. 🔔
        </p>
      </div>

      <InstallGuide />

      <Button nativeButton={false} render={<Link href="/" />} variant="ghost" className="mt-auto h-11">
        Later, breng me naar de app
      </Button>
    </main>
  );
}
