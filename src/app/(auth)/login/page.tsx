import Link from "next/link";
import type { Metadata } from "next";
import { login } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="animate-rise space-y-8">
      <div className="space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="size-14 rounded-2xl shadow-warm-md"
        />
        <div>
          <p className="label-eyebrow">Welkom terug</p>
          <h1 className="mt-1 font-heading text-[34px] leading-[1.05] font-extrabold">
            Nesi<span className="text-cig">Plan</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log in om Nesibe&apos;s agenda te zien.
          </p>
        </div>
      </div>

      <AuthForm action={login} label="Inloggen">
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />

        <div className="space-y-2">
          <Label htmlFor="identifier" className="label-eyebrow">
            Gebruikersnaam of e-mail
          </Label>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            required
            className="h-12 rounded-xl bg-card px-4 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="label-eyebrow">
            Wachtwoord
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-12 rounded-xl bg-card px-4 text-base"
          />
        </div>
      </AuthForm>

      <p className="text-center text-sm text-muted-foreground">
        Nog geen account?{" "}
        <Link href="/register" className="font-bold text-cig underline-offset-4 hover:underline">
          Registreren
        </Link>
      </p>
    </div>
  );
}
