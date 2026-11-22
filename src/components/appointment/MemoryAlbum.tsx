"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export type MemoryItem = {
  id: string;
  storage_path: string;
  caption: string | null;
  user_id: string;
  url: string;
};

/**
 * Foto-album van een voorbije afspraak. Foto's worden client-side verkleind
 * (max 1600px, ~0,5 MB) en in de prive-bucket `memories` gezet onder
 * {appointment_id}/{user_id}/.
 */
export function MemoryAlbum({
  appointmentId,
  memories,
  canUpload,
  myId,
}: {
  appointmentId: string;
  memories: MemoryItem[];
  canUpload: boolean;
  myId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  async function upload(files: FileList) {
    setUploading(true);
    const supabase = createClient();

    try {
      for (const file of Array.from(files)) {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 0.5,
          useWebWorker: true,
        });

        const path = `${appointmentId}/${myId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("memories")
          .upload(path, compressed, { contentType: compressed.type || "image/jpeg" });
        if (uploadError) throw uploadError;

        const { error: rowError } = await supabase
          .from("memories")
          .insert({ appointment_id: appointmentId, user_id: myId, storage_path: path });
        if (rowError) {
          // De rij is de bron van waarheid: zonder rij hoort het bestand er niet te zijn.
          await supabase.storage.from("memories").remove([path]);
          throw rowError;
        }
      }
      toast.success("Foto's toegevoegd 📸");
      startTransition(() => router.refresh());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Uploaden lukte niet");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold">Herinneringen 📸</h2>
        {canUpload ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            <ImagePlus className="size-4" />
            {uploading ? "Bezig…" : "Voeg toe"}
          </Button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />

      {memories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nog geen foto&apos;s van deze afspraak.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {memories.map((memory, index) => (
            <li key={memory.id}>
              <button
                type="button"
                onClick={() => setViewing(index)}
                className="block aspect-square w-full overflow-hidden rounded-lg bg-muted"
                aria-label={memory.caption ?? "Bekijk foto"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={memory.url}
                  alt={memory.caption ?? ""}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewing !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewing(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto"
        >
          <button
            type="button"
            aria-label="Sluiten"
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => setViewing(null)}
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={memories[viewing].url}
            alt={memories[viewing].caption ?? ""}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
