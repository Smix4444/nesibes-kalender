"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/app/(auth)/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl text-base font-bold shadow-warm-md">
      {pending ? "Momentje…" : label}
    </Button>
  );
}

export function AuthForm({
  action,
  label,
  children,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  label: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error ? (
        <p
          role="alert"
          className="animate-pop flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
        >
          <span aria-hidden>⚠</span>
          {state.error}
        </p>
      ) : null}
      <SubmitButton label={label} />
    </form>
  );
}
