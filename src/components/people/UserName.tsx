import { cn } from "@/lib/utils";
import { ROLE_META, type AppRole } from "@/lib/config";

type NameProfile = { display_name: string; role: AppRole; emoji?: string | null };

/**
 * Naam met rol-badge. Dragos (vip) krijgt een gouden verloop, Rayan (admin)
 * het roze BF-hartje.
 */
export function UserName({
  profile,
  className,
  showEmoji = false,
}: {
  profile: NameProfile;
  className?: string;
  showEmoji?: boolean;
}) {
  const meta = ROLE_META[profile.role];
  const isVip = profile.role === "vip";

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {showEmoji && profile.emoji ? <span aria-hidden>{profile.emoji}</span> : null}
      <span className={cn(isVip && "text-gold font-extrabold")}>{profile.display_name}</span>
      {profile.role !== "member" ? (
        <span title={meta.label} aria-label={meta.label}>
          {meta.emoji}
        </span>
      ) : null}
    </span>
  );
}
