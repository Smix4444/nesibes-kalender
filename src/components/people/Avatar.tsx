import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/config";

type AvatarProfile = {
  display_name: string;
  emoji: string;
  color: string;
  avatar_url?: string | null;
  role: AppRole;
};

/** Ronde avatar: foto als die er is, anders de emoji op de eigen kleur. */
export function Avatar({
  profile,
  size = 40,
  className,
}: {
  profile: AvatarProfile;
  size?: number;
  className?: string;
}) {
  const ring =
    profile.role === "vip" ? "ring-gold" : profile.role === "admin" ? "ring-bf" : undefined;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center",
        ring,
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: profile.avatar_url ? undefined : profile.color,
        backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : undefined,
        fontSize: size * 0.45,
      }}
      title={profile.display_name}
    >
      {profile.avatar_url ? null : <span aria-hidden>{profile.emoji}</span>}
    </span>
  );
}
