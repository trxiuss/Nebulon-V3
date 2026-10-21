import { getRequestContext } from "@cloudflare/next-on-pages";

export function getEnv() {
  try {
    const ctx = getRequestContext();
    if (ctx && ctx.env) return ctx.env;
  } catch (err) {}
  return (typeof process !== "undefined" && process.env) || {};
}

export function getDB() {
  const env = getEnv();
  if (env && env.DB) return env.DB;
  throw new Error("DB_BINDING_MISSING");
}
