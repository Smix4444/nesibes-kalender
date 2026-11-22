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
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-extrabold">Doe mee 🎉</h1>
        <p className="text-sm text-muted-foreground">
          Je hebt een uitnodigingscode nodig. Vraag die aan Rayan.
        </p>
      </div>

      <AuthForm action={register} label="Account aanmaken">
        <div className="space-y-1.5">
          <Label htmlFor="invite_code">Uitnodigingscode</Label>
          <Input id="invite_code" name="invite_code" required className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Gebruikersnaam</Label>
          <Input
            id="username"
            name="username"
            required
            pattern="[a-z0-9_]{3,20}"
            autoComplete="username"
            placeholder="tuana"
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">3-20 tekens: a-z, 0-9 en _</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Hoe noemen we je?</Label>
          <Input id="display_name" name="display_name" required maxLength={30} placeholder="Tuana" className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-12" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Wachtwoord</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-12"
          />
        </div>
        <EmojiPicker />
      </AuthForm>

      <p className="text-center text-sm text-muted-foreground">
        Heb je al een account?{" "}
        <Link href="/login" className="font-semibold text-cig underline-offset-4 hover:underline">
          Inloggen
        </Link>
      </p>
    </>
  );
}
