"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 4000;
const SSE_RETRY_MS = 5000;

const store = {
  permissions: [],
  stamp: "",
  epoch: 0,
  role: null,
  roleRank: null,
  fullAccess: false,
  isSystemAdmin: false,
  loaded: false,
  authed: true,
  fetching: false,
  pending: null,
  listeners: new Set(),
  timer: null,
  source: null,
  bound: false,
  redirecting: false
};

function snapshot() {
  return {
    permissions: store.permissions,
    stamp: store.stamp,
    epoch: store.epoch,
    role: store.role,
    roleRank: store.roleRank,
    fullAccess: store.fullAccess,
    isSystemAdmin: store.isSystemAdmin,
    loaded: store.loaded,
    authed: store.authed
  };
}

function emit() {
  const data = snapshot();
  store.listeners.forEach((listener) => listener(data));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nebulon:permissions-changed", { detail: data }));
  }
}

function sameList(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function runSync() {
  const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
  const data = await res.json().catch(() => null);
  const user = data && data.user ? data.user : null;
  const nextPermissions = Array.isArray(user?.permissions) ? [...user.permissions].sort() : [];
  const nextStamp = typeof user?.stamp === "string" ? user.stamp : nextPermissions.join("|");
  const nextEpoch = Number(data?.epoch) || 0;
  const changed =
    store.stamp !== nextStamp ||
    store.epoch !== nextEpoch ||
    !sameList(store.permissions, nextPermissions) ||
    store.authed !== Boolean(user) ||
    !store.loaded;

  store.permissions = nextPermissions;
  store.stamp = nextStamp;
  store.epoch = nextEpoch;
  store.role = user?.role ?? null;
  store.roleRank = user?.roleRank ?? null;
  store.fullAccess = Boolean(user?.fullAccess);
  store.isSystemAdmin = Boolean(user?.isSystemAdmin);
  store.authed = Boolean(user);
  store.loaded = true;

  if (changed) emit();

  if (typeof window !== "undefined" && !store.authed && !store.redirecting && !window.location.pathname.startsWith("/login")) {
    store.redirecting = true;
    if (store.timer) {
      clearInterval(store.timer);
      store.timer = null;
    }
    if (store.source) {
      try {
        store.source.close();
      } catch (err) {}
      store.source = null;
    }
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
    } catch (err) {}
    window.location.replace("/login");
  }

  return snapshot();
}

function syncPermissions() {
  if (typeof window === "undefined") return Promise.resolve(snapshot());
  if (store.pending) return store.pending;
  store.pending = runSync()
    .catch(() => {
      store.loaded = true;
      emit();
      return snapshot();
    })
    .finally(() => {
      store.pending = null;
    });
  return store.pending;
}

function connectStream() {
  if (typeof window === "undefined" || typeof EventSource === "undefined") return;
  if (store.source || store.redirecting) return;

  let source;
  try {
    source = new EventSource("/api/auth/permission-stream");
  } catch (err) {
    return;
  }
  store.source = source;

  source.addEventListener("state", (event) => {
    let payload = null;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (!payload) return;
    if (!payload.authed) {
      syncPermissions();
      return;
    }
    if (payload.stamp !== store.stamp || Number(payload.epoch) !== store.epoch) {
      syncPermissions();
    }
  });

  source.addEventListener("error", () => {
    try {
      source.close();
    } catch (err) {}
    if (store.source === source) store.source = null;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (store.bound) connectStream();
    }, SSE_RETRY_MS);
  });

  source.addEventListener("close", () => {
    try {
      source.close();
    } catch (err) {}
    if (store.source === source) store.source = null;
    if (store.bound) connectStream();
  });
}

let unbindHandlers = null;
let retryTimer = null;

function bind() {
  if (store.bound || typeof window === "undefined") return;
  store.bound = true;

  store.timer = setInterval(syncPermissions, POLL_INTERVAL_MS);
  connectStream();

  const trigger = () => {
    if (document.visibilityState === "visible") syncPermissions();
  };

  window.addEventListener("focus", syncPermissions);
  window.addEventListener("online", syncPermissions);
  window.addEventListener("nebulon:permission-denied", syncPermissions);
  document.addEventListener("visibilitychange", trigger);

  unbindHandlers = () => {
    window.removeEventListener("focus", syncPermissions);
    window.removeEventListener("online", syncPermissions);
    window.removeEventListener("nebulon:permission-denied", syncPermissions);
    document.removeEventListener("visibilitychange", trigger);
  };
}

function unbind() {
  if (!store.bound) return;
  store.bound = false;
  if (store.timer) {
    clearInterval(store.timer);
    store.timer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (store.source) {
    try {
      store.source.close();
    } catch (err) {}
    store.source = null;
  }
  if (unbindHandlers) {
    unbindHandlers();
    unbindHandlers = null;
  }
}

export async function adminFetch(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";

  if (mutating) await syncPermissions();

  const headers = new Headers(options.headers || {});
  if (mutating && store.stamp) headers.set("x-perm-stamp", store.stamp);

  const res = await fetch(url, {
    ...options,
    headers,
    cache: options.cache || "no-store",
    credentials: "same-origin"
  });

  if (res.status === 401 || res.status === 403 || res.status === 409) {
    await syncPermissions();
  }

  return res;
}

export default function useAdminPermissions() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const listener = (data) => setState(data);
    store.listeners.add(listener);
    bind();
    syncPermissions();
    return () => {
      store.listeners.delete(listener);
      if (store.listeners.size === 0) unbind();
    };
  }, []);

  function can(permission) {
    const list = state.permissions;
    if (!Array.isArray(list)) return false;
    if (list.includes("*")) return true;
    if (Array.isArray(permission)) return permission.some((item) => list.includes(item));
    return list.includes(permission);
  }

  return {
    permissions: state.permissions,
    stamp: state.stamp,
    epoch: state.epoch,
    role: state.role,
    roleRank: state.roleRank,
    fullAccess: state.fullAccess,
    isSystemAdmin: state.isSystemAdmin,
    loaded: state.loaded,
    authed: state.authed,
    can,
    refresh: syncPermissions
  };
}
