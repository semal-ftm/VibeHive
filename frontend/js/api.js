/* ==========================================================================
   api.js — tiny client for the VibeHive Django REST API
   - stores the auth token in localStorage
   - sends "Authorization: Token <key>" on every request
   - turns DRF error payloads into readable messages
   ========================================================================== */

const API = (() => {
  // Where the Django API lives – set in js/config.js ("" = same server).
  const BASE = window.VIBEHIVE_API_BASE ?? "";

  const TOKEN_KEY = "vh_token";
  const USER_KEY = "vh_user";
  const ACCOUNTS_KEY = "vh_accounts";
  const MAX_ACCOUNTS = 5;

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data || {};
    }
  }

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
  };

  /* ---------- saved accounts on this device ----------
     Everyone who logs in on this device is remembered (like Instagram's
     account switcher). Each entry keeps its own token, so reopening the app
     – or tapping a saved account – goes straight back into that profile. */
  const accounts = {
    list() {
      return read(ACCOUNTS_KEY, []).sort((a, b) => b.lastUsed - a.lastUsed);
    },
    upsert(user, token) {
      const others = read(ACCOUNTS_KEY, []).filter((a) => a.id !== user.id);
      const previous = read(ACCOUNTS_KEY, []).find((a) => a.id === user.id);
      const entry = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar: user.avatar,
        token: token === undefined ? previous?.token ?? null : token,
        lastUsed: Date.now(),
      };
      write(ACCOUNTS_KEY, [entry, ...others].slice(0, MAX_ACCOUNTS));
    },
    forgetToken(userId) {
      write(ACCOUNTS_KEY, read(ACCOUNTS_KEY, []).map((a) => (a.id === userId ? { ...a, token: null } : a)));
    },
    remove(userId) {
      write(ACCOUNTS_KEY, read(ACCOUNTS_KEY, []).filter((a) => a.id !== userId));
    },
  };

  /* ---------- current session ---------- */
  const session = {
    get token() {
      try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
    },
    get user() {
      return read(USER_KEY, null);
    },
    save(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      write(USER_KEY, user);
      accounts.upsert(user, token);
    },
    setUser(user) {
      write(USER_KEY, user);
      if (session.token) accounts.upsert(user);
    },
    /** Stop using the current account on this page, but keep it saved. */
    leave() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    /** Log out for real: the saved account stays listed but needs a password. */
    clear() {
      const user = session.user;
      if (user) accounts.forgetToken(user.id);
      session.leave();
    },
  };

  /* ---------- error message extraction ---------- */
  function messageFrom(data, status) {
    if (!data) return status >= 500 ? "The hive hit a snag on our side. Please try again." : "Something went wrong.";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (Array.isArray(data.non_field_errors)) return data.non_field_errors[0];
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const value = data[firstKey];
      const text = Array.isArray(value) ? value[0] : value;
      return typeof text === "string" ? text : "Please check the form and try again.";
    }
    return "Something went wrong.";
  }

  /* ---------- core request ---------- */
  async function request(path, { method = "GET", body, auth = true, token: tokenOverride } = {}) {
    const url = path.startsWith("http") ? path : `${BASE}/api${path}`;
    const headers = { Accept: "application/json" };
    const token = tokenOverride || session.token;
    if (auth && token) headers.Authorization = `Token ${token}`;

    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, { method, headers, body: payload });
    } catch {
      throw new ApiError("Can't reach the hive. Check your connection or make sure the server is running.", 0);
    }

    // Expired/invalid token → back to login
    if (response.status === 401 && auth && token && !tokenOverride) {
      session.clear();
      if (!/login|register/.test(location.pathname)) {
        const page = location.pathname.split("/").pop() || "index.html";
        location.href = `login.html?next=${encodeURIComponent(page + location.search)}`;
      }
    }

    if (response.status === 204) return null;

    let data = null;
    try { data = await response.json(); } catch { /* empty or non-JSON body */ }

    if (!response.ok) {
      if (response.status === 413) throw new ApiError("That file is too large to upload.", 413);
      if (response.status === 429) throw new ApiError("Whoa, slow down a little! Try again in a minute.", 429);
      throw new ApiError(messageFrom(data, response.status), response.status, data);
    }
    return data;
  }

  return {
    BASE,
    ApiError,
    session,
    accounts,
    request,
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    del: (path) => request(path, { method: "DELETE" }),
  };
})();
