import { AppHeader } from "@/components/nav/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { getInboxCount, getUnreadCount, requireProfile } from "@/lib/auth";

/** Shell voor alle ingelogde schermen; de proxy regelt de redirect naar /login. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  const [unread, inbox] = await Promise.all([
    getUnreadCount(),
    profile.role === "owner" ? getInboxCount() : Promise.resolve(0),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader unreadCount={unread} />
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-5 pt-6 pb-32">{children}</main>
      <BottomNav role={profile.role} inboxCount={inbox} />
    </div>
  );
}
