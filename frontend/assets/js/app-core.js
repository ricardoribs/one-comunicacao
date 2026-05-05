(function bootstrapOneApp() {
  const API_BASE = window.ONE_CONFIG?.apiBase || "/api";
  const API_URL = new URL(API_BASE, window.location.origin);
  const API_ORIGIN = API_URL.origin;
  const API_PATHNAME = API_URL.pathname.replace(/\/$/, "");
  const CHANNEL_NAME = "one_auth_channel";
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 10000;
  const SessionStore = (() => {
    let currentSession = null;

    return {
      get() {
        return currentSession;
      },
      set(session) {
        currentSession = session || null;
      },
      clear() {
        currentSession = null;
      }
    };
  })();

  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  const logoutListeners = new Set();
  const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
  let idleTimer = null;
  let warningTimer = null;
  let refreshInFlight = null;

  function resolveLoginPath() {
    const currentPath = window.location.pathname || "/";

    if (currentPath.includes("painel-interno")) {
      return "/painel-interno.html";
    }

    return "/";
  }

  function redirectToLogin() {
    const target = resolveLoginPath();

    if (window.location.pathname !== target) {
      window.location.href = target;
    }
  }

  function loadSession() {
    return SessionStore.get();
  }

  function saveSession(session) {
    SessionStore.set(session);
    scheduleIdleTimers();
  }

  function clearSession() {
    SessionStore.clear();
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);
  }

  function parseJwt(token) {
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch (_error) {
      return null;
    }
  }

  function isTokenExpired(token, skewSeconds = 30) {
    const payload = parseJwt(token);
    if (!payload?.exp) {
      return true;
    }
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  }

  function notifyLogout(reason) {
    if (channel) {
      channel.postMessage({ type: "logout", reason });
    }
    logoutListeners.forEach((listener) => listener(reason));
  }

  function buildOriginUrl(path) {
    if (!path) {
      return API_ORIGIN;
    }

    if (/^[a-z]+:\/\//i.test(path)) {
      return path;
    }

    const normalized = String(path).startsWith("/") ? String(path) : `/${String(path)}`;
    return `${API_ORIGIN}${normalized}`;
  }

  function buildApiUrl(path) {
    if (!path) {
      return API_URL.toString();
    }

    const normalized = String(path);
    if (/^[a-z]+:\/\//i.test(normalized)) {
      return normalized;
    }

    if (
      normalized === API_PATHNAME ||
      normalized.startsWith(`${API_PATHNAME}/`) ||
      normalized === "/api" ||
      normalized.startsWith("/api/")
    ) {
      return buildOriginUrl(normalized);
    }

    const suffix = normalized.startsWith("/") ? normalized : `/${normalized}`;
    return `${API_ORIGIN}${API_PATHNAME}${suffix}`;
  }

  async function refreshSession() {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const response = await fetch(buildApiUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        clearSession();
        notifyLogout("session-expired");
        redirectToLogin();
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const session = await response.json();
      saveSession(session);
      return session;
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function ensureFreshSession() {
    const session = loadSession();
    const accessToken = session?.accessToken || session?.token;

    if (!accessToken) {
      return refreshSession();
    }

    if (!isTokenExpired(accessToken)) {
      return session;
    }

    return refreshSession();
  }

  async function fetchJson(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    if (!isFormData && options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth !== false) {
      const session = await ensureFreshSession();
      const accessToken = session?.accessToken || session?.token;
      if (!accessToken) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildApiUrl(path), {
        ...options,
        headers,
        credentials: "include",
        signal: options.signal || controller.signal
      });

      if (response.status === 204) {
        return null;
      }

      if (
        response.status === 401 &&
        options.auth !== false &&
        !options.skipAuthRefresh &&
        !path.startsWith("/auth/login") &&
        !path.startsWith("/auth/refresh")
      ) {
        await refreshSession();
        return fetchJson(path, { ...options, skipAuthRefresh: true });
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Não foi possível concluir a solicitação.");
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("A requisição demorou mais do que o esperado. Tente novamente.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function openAuthorizedUrl(url) {
    if (!url) {
      throw new Error("Arquivo ainda não disponível.");
    }

    if (url.startsWith("/api/files/")) {
      const downloadWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

      try {
        const response = await fetchJson(url, { method: "GET" });
        if (!response?.url) {
          throw new Error("Não foi possível preparar o arquivo para download.");
        }

        const assetResponse = await fetch(response.url, {
          method: "GET",
          credentials: "omit"
        });

        if (!assetResponse.ok) {
          throw new Error("NÃ£o foi possÃ­vel abrir o arquivo solicitado.");
        }

        const blob = await assetResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        if (downloadWindow) {
          downloadWindow.location = blobUrl;
        } else {
          window.open(blobUrl, "_blank", "noopener,noreferrer");
        }

        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        return blobUrl;
      } catch (error) {
        downloadWindow?.close();
        throw error;
      }
    }

    if (url.startsWith("/uploads/")) {
      const session = await ensureFreshSession();
      const accessToken = session?.accessToken || session?.token;

      if (!accessToken) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const response = await fetch(buildOriginUrl(url), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Não foi possível abrir o arquivo solicitado.");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
      return blobUrl;
    }

    window.open(url, "_blank", "noopener,noreferrer");
    return url;
  }

  async function logout(options = {}) {
    try {
      await fetch(buildApiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include"
      });
    } finally {
      clearSession();
      notifyLogout(options.reason || "manual");
    }
  }

  function onLogout(listener) {
    logoutListeners.add(listener);
    return () => logoutListeners.delete(listener);
  }

  function scheduleIdleTimers() {
    clearTimeout(idleTimer);
    clearTimeout(warningTimer);

    if (!loadSession()) {
      return;
    }

    warningTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("one:idle-warning"));
    }, IDLE_TIMEOUT_MS - 60000);

    idleTimer = setTimeout(() => {
      logout({ reason: "idle-timeout" });
    }, IDLE_TIMEOUT_MS);
  }

  function registerActivityTracking() {
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleIdleTimers, { passive: true });
    });
    scheduleIdleTimers();
  }

  function requireRole(allowedRoles, fallback) {
    const session = loadSession();
    const role = session?.user?.role;
    if (!session || !role || !allowedRoles.includes(role)) {
      if (typeof fallback === "function") {
        fallback();
      }
      return false;
    }
    return true;
  }

  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === "logout") {
        clearSession();
        logoutListeners.forEach((listener) => listener(event.data.reason || "manual"));
      }
    };
  }

  window.ONE_APP = {
    apiBase: API_BASE,
    buildApiUrl,
    buildOriginUrl,
    loadSession,
    saveSession,
    clearSession,
    parseJwt,
    isTokenExpired,
    refreshSession,
    ensureFreshSession,
    fetchJson,
    openAuthorizedUrl,
    logout,
    onLogout,
    registerActivityTracking,
    requireRole
  };
})();
