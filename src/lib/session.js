import { cookies } from "next/headers";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME
} from "@/lib/crypto";

export async function setSessionCookie(user) {
  const token = await createSessionToken({ uid: user.id, username: user.username, tv: user.token_version });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch (err) {
    return null;
  }
}

export { verifySessionToken, SESSION_COOKIE_NAME };
