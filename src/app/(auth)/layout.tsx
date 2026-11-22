export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="relative z-10 flex min-h-dvh flex-col">{children}</main>;
}
