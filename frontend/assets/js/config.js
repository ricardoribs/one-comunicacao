window.ONE_CONFIG = {
  apiBase:
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "/api"
      : (window.__ONE_API_BASE__ || "/api")
};
