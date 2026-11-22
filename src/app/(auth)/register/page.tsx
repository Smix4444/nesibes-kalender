import Link from "next/link";
import type { Metadata } from "next";
import { register } from "../actions";
import { AuthForm } from "@/components/auth/AuthForm";
import { EmojiPicker } from "@/components/auth/EmojiPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Registreren" };

export default function RegisterPage() {
  return (
    <>
      <header className="relative overflow-hidden bg-background px-6 pt-safe pb-6">
        <span
          className="absolute -top-20 -right-16 size-56 rotate-[-18deg] rounded-[46%] bg-cig-2/[0.05]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-md pt-12">
          <h1 className="font-heading text-[34px] leading-tight font-extrabold">Doe mee</h1>
          <p className="mt-2 max-w-[30ch] text-[15px] text-muted-foreground">
            Je hebt een uitnodigingscode nodig. Vraag die aan Rayan.
          </p>
        </div>
      </header>

      <div className="relative bg-background px-6 pb-16">
      <div className="mx-auto w-full max-w-md pt-8">
      <AuthForm action={register} label="Account aanmaken">
        <div className="space-y-1.5">
          <Label htmlFor="invite_code" className="label-eyebrow">Uitnodigingscode</Label>
          <Input id="invite_code" name="invite_code" required className="h-12 rounded-xl bg-card px-4 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username" className="label-eyebrow">Gebruikersnaam</Label>
          <Input
            id="username"
            name="username"
            required
            pattern="[a-z0-9_]{3,20}"
            autoComplete="username"
            placeholder="tuana"
            className="h-12 rounded-xl bg-card px-4 text-base"
          />
          <p className="text-xs text-muted-foreground">3-20 tekens: a-z, 0-9 en _</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_name" className="label-eyebrow">Hoe noemen we je?</Label>
          <Input id="display_name" name="display_name" required maxLength={30} placeholder="Tuana" className="h-12 rounded-xl bg-card px-4 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="label-eyebrow">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-12 rounded-xl bg-card px-4 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="label-eyebrow">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-12 rounded-xl bg-card px-4 text-base"
          />
        </div>
        <EmojiPicker />
      </AuthForm>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Heb je al een account?{" "}
        <Link href="/login" className="font-bold text-cig underline-offset-4 hover:underline">
          Inloggen
        </Link>
      </p>
      </div>
      </div>
    </>
  );
}
