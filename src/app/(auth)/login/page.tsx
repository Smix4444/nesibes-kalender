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
    <>
      {/* Donkerblauw paneel bovenaan, wit formulier eronder. */}
      <header className="relative overflow-hidden bg-[#0a1020] px-6 pt-safe pb-14 text-white">
        <span
          className="absolute -top-20 -right-16 size-64 rotate-[-18deg] rounded-[46%] bg-white/[0.06]"
          aria-hidden
        />
        <span
          className="absolute -bottom-24 -left-20 size-56 rotate-[12deg] rounded-[46%] bg-cig-2/20"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-md pt-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-14 rounded-[18px] shadow-warm-lg" />
          <h1 className="mt-6 font-heading text-[40px] leading-[1.02] font-extrabold tracking-tight">
            Nesi<span className="text-cig-2">Plan</span>
          </h1>
          <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-white/60">
            De agenda van Nesibe. Vraag een moment aan, bied mee, en zie wanneer
            ze vrij is.
          </p>
        </div>
      </header>

      <div className="relative -mt-8 flex flex-1 flex-col justify-center rounded-t-[28px] bg-background px-6 pb-16 shadow-warm-lg">
        <div className="mx-auto w-full max-w-md pt-8">
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
                placeholder="nesibe"
                required
                className="h-12 rounded-xl border-input bg-card px-4 text-base"
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
                placeholder="••••••••"
                required
                className="h-12 rounded-xl border-input bg-card px-4 text-base"
              />
            </div>
          </AuthForm>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Nog geen account?{" "}
            <Link
              href="/register"
              className="font-bold text-cig underline-offset-4 hover:underline"
            >
              Registreren
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
