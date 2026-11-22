import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 noemt middleware "proxy". Deze ververst de Supabase-sessie bij elke
 * navigatie en stuurt uitgelogde bezoekers naar /login.
 */
const PUBLIC_PATHS = ["/login", "/register", "/install", "/auth"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Belangrijk: niet tussen createServerClient en getUser() iets anders doen.
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Heeft deze browser uberhaupt een sessiecookie?
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

  // Hapert Supabase even, dan is dat geen reden om iemand uit te loggen: de
  // pagina's doen zelf ook nog een controle via requireProfile().
  const transientFailure = !user && error !== null && hasSessionCookie;

  if (!user && !isPublic && !transientFailure) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // /api blijft buiten de proxy: die routes regelen hun eigen toegang.
  // /api/push/dispatch wordt door de database aangeroepen (met een secret-
  // header, zonder cookie) en /api/calendar/[token] door Google Agenda; een
  // redirect naar /login zou die allebei stilletjes breken.
  matcher: ["/((?!api|_next/static|_next/image|icons|manifest.webmanifest|sw.js|favicon.ico).*)"],
};
