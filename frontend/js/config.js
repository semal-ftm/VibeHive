/* ==========================================================================
   config.js — where the frontend finds the VibeHive API
   Loaded first on every page.
   ========================================================================== */

(() => {
  // 👉 After deploying the backend, put its address here (no trailing slash).
  //    The Android app (Capacitor) uses it, because the app itself is not
  //    served by Django. Example: "https://yourname.pythonanywhere.com"
  const PRODUCTION_API = "https://YOUR-USERNAME.pythonanywhere.com";

  const isNativeApp = !!window.Capacitor?.isNativePlatform?.() ||
    (location.hostname === "localhost" && location.port === "" && /^(https|capacitor):$/.test(location.protocol));
  const isStaticDevServer = location.protocol === "file:" || ["5500", "5501", "3000", "8080"].includes(location.port);

  window.VIBEHIVE_API_BASE =
    window.VIBEHIVE_API_BASE ??
    (isNativeApp ? PRODUCTION_API : isStaticDevServer ? "http://127.0.0.1:8000" : ""); // "" = same server as this page
})();
