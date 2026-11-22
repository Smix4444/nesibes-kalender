import Link from "next/link";
import type { Metadata } from "next";
import { login } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <>
      <div className="space-y-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="mx-auto size-16 rounded-2xl shadow-md" />
        <h1 className="font-heading text-2xl font-extrabold">
          Welkom bij {APP_NAME}
        </h1>
        <p className="text-sm text-muted-foreground">Log in om Nesibe&apos;s agenda te zien.</p>
      </div>

      <AuthForm action={login} label="Inloggen">
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Gebruikersnaam of e-mail</Label>
          <Input id="identifier" name="identifier" autoComplete="username" required className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12"
          />
        </div>
      </AuthForm>

      <p className="text-center text-sm text-muted-foreground">
        Nog geen account?{" "}
        <Link href="/register" className="font-semibold text-cig underline-offset-4 hover:underline">
          Registreren
        </Link>
      </p>
    </>
  );
}
