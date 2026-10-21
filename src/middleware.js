import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/crypto";

const ALLOWED_HOSTS = [
  "nebulonproject.com",
  "www.nebulonproject.com"
];

const ALLOWED_HOST_SUFFIXES = [];

function isAllowedHost(host) {
  if (!host) return false;
  if (ALLOWED_HOSTS.includes(host)) return true;

  const hostname = host.split(":")[0];

  if (ALLOWED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;

  return false;
}

const MONITORED_UA_PATTERNS = [
  "httrack", "webcopier", "webzip", "teleport", "sitesucker",
  "offline explorer", "webreaper", "backstreet", "wget", "curl",
  "python-requests", "python-urllib", "scrapy", "go-http-client",
  "libwww-perl", "node-fetch", "axios/", "java/", "okhttp",
  "winhttp", "mechanize", "phantomjs"
];

export async function middleware(request) {
  const host = request.headers.get("host") || "";

  if (!isAllowedHost(host)) {
    return new NextResponse("403 Forbidden", { status: 403 });
  }

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const matchedUa = MONITORED_UA_PATTERNS.find((pattern) => ua.includes(pattern));

  if (matchedUa) {
    console.info(`[nebulon] otomatik istemci tespit edildi (engellenmedi): ${matchedUa}`);
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
  return NextResponse.next({ request: { headers: forwardedHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|assets/).*)"
};
