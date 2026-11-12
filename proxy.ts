import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  if (process.env.DEBATIFY_INTEGRATIONS_ENABLED !== "true") {
    if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.json({ error: "External integrations are disabled in this portfolio checkout." }, { status: 503 });
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "External integrations are disabled in this portfolio checkout." }, { status: 503 });
    if (request.nextUrl.pathname.startsWith("/main") || request.nextUrl.pathname.startsWith("/account") || request.nextUrl.pathname === "/welcome") return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  const { updateSession } = await import("@/utils/supabase/middleware");
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"] };
