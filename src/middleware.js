import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/crypto";

const MONITORED_UA_PATTERNS = [
  "httrack", "webcopier", "webzip", "teleport", "sitesucker",
  "offline explorer", "webreaper", "backstreet", "wget", "curl",
  "python-requests", "python-urllib", "scrapy", "go-http-client",
  "libwww-perl", "node-fetch", "axios/", "java/", "okhttp",
  "winhttp", "mechanize", "phantomjs"
];

export async function middleware(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const matchedUa = MONITORED_UA_PATTERNS.find((pattern) =>
    ua.includes(pattern)
  );

  if (matchedUa) {
    console.info(
      `[nebulon] otomatik istemci tespit edildi (engellenmedi): ${matchedUa}`
    );
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session = null;

  if (token) {
    try {
      session = await verifySessionToken(token);
    } catch (err) {
      session = null;
    }
  }

  if (pathname.startsWith("/dashboard") && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && session) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-nebulon-path", pathname);

  return NextResponse.next({
    request: { headers: forwardedHeaders }
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|assets/).*)"
};
