import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RequestCard } from "@/components/appointment/RequestCard";
import { requireProfile } from "@/lib/auth";
import { getInbox } from "@/lib/data";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const profile = await requireProfile();
  if (profile.role !== "owner" && profile.role !== "admin") redirect("/");

  const requests = await getInbox();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-extrabold">Inbox 📥</h1>
        <p className="text-sm text-muted-foreground">
          {requests.length === 0
            ? "Alles afgehandeld."
            : `${requests.length} aanvraag${requests.length === 1 ? "" : "en"} — Rayan en Dragos staan bovenaan.`}
        </p>
      </header>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Lege inbox, lekker rustig 🧘‍♀️
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <RequestCard appointment={request} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
