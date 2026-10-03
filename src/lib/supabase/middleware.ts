import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register"];
// /admin is listed here only as defense-in-depth (redirects logged-out
// requests early, cheaply) — it is NOT the admin authorization boundary.
// The real check is requireAdmin() in src/lib/admin/auth.ts, enforced by
// src/app/admin/layout.tsx on every request to that layout, including ones
// this matcher might ever miss. A logged-in NON-admin user passes this
// check fine (they're authenticated) and is correctly rejected downstream
// by requireAdmin() with a 404, not here.
const AUTHED_ONLY_PREFIXES = ["/app", "/settings", "/admin"];

/**
 * Refreshes the Supabase auth session on every request and redirects:
 * - unauthenticated users away from /app/*, /settings, and /admin
 * - authenticated users away from /login and /register
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthedOnlyPath = AUTHED_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!user && isAuthedOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && PUBLIC_PATHS.includes(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
