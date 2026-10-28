import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE_NAME, isStaffRole } from "@/lib/auth/session";

const PROTECTED_PAGES = ["/account"];
const ADMIN_PUBLIC = ["/admin/login"];

function securityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const isApi = pathname.startsWith("/api");
  const wantsJson = isApi || req.headers.get("accept")?.includes("application/json");

  const upstream = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  if (session) {
    upstream.headers.set("x-vk-user", session.sub);
    upstream.headers.set("x-vk-role", session.role);
  }

  securityHeaders(upstream);

  /* Admin surface */
  if (pathname.startsWith("/admin")) {
    const isPublicAdminPage = ADMIN_PUBLIC.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

    if (!isPublicAdminPage) {
      if (!session) {
        if (wantsJson) {
          return NextResponse.json(
            { ok: false, code: "UNAUTHENTICATED", error: "Sign in required." },
            { status: 401 },
          );
        }
        return redirectTo(req, `/admin/login?next=${encodeURIComponent(pathname + search)}`);
      }

      if (!isStaffRole(session.role)) {
        if (wantsJson) {
          return NextResponse.json(
            { ok: false, code: "FORBIDDEN", error: "Access denied." },
            { status: 403 },
          );
        }
        return redirectTo(req, "/forbidden");
      }
    } else if (session && isStaffRole(session.role)) {
      return redirectTo(req, "/admin/dashboard");
    }

    return upstream;
  }

  if (pathname.startsWith("/forbidden") || pathname.startsWith("/auth")) {
    return upstream;
  }

  /* Customer protected pages. Checkout is intentionally guest-friendly. */
  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!session) {
      if (wantsJson) {
        return NextResponse.json(
          { ok: false, code: "UNAUTHENTICATED", error: "Sign in required." },
          { status: 401 },
        );
      }
      return redirectTo(req, `/auth/login?next=${encodeURIComponent(pathname + search)}`);
    }
  }

  /* Only hard-gate admin APIs here. Other APIs enforce their own auth. */
  if (isApi && pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHENTICATED", error: "Sign in required." },
        { status: 401 },
      );
    }
    if (!isStaffRole(session.role)) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", error: "Access denied." },
        { status: 403 },
      );
    }
  }

  return upstream;
}

function redirectTo(req: NextRequest, dest: string) {
  const res = NextResponse.redirect(new URL(dest, req.url));
  return securityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks).*)"],
};