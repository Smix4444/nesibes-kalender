import { AppHeader } from "@/components/nav/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";

/**
 * Shell voor alle ingelogde schermen: sticky header met belletje,
 * inhoud, en de bottom nav. De auth-guard komt in fase 3 in deze layout.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-28">{children}</main>
      <BottomNav role="member" />
    </div>
  );
}
