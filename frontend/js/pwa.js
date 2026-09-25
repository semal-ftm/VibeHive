/* ==========================================================================
   pwa.js — makes VibeHive installable
   • registers the service worker (sw.js)
   • shows an "Install app" button when the browser allows installing
   • on iPhone/iPad (no install prompt) explains "Share → Add to Home Screen"
   Loaded last on every page.
   ========================================================================== */

(() => {
  const isNativeApp = !!window.Capacitor?.isNativePlatform?.();
  const isInstalled = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if ("serviceWorker" in navigator && !isNativeApp && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    // A new version of the app was installed: reload once so every file is the new one
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
  }
  if (isNativeApp || isInstalled) return; // already an app – nothing to offer

  let deferredPrompt = null;

  /* Install buttons: sidebar, mobile top bar, login/register card */
  const makeButtons = () => {
    const spots = [
      [".sidebar-footer", "afterbegin", `<button class="btn btn-outline btn-sm install-btn" type="button" data-install-app hidden>${VH.icon("download")}<span class="label">Install app</span></button>`],
      [".mobile-top-actions", "afterbegin", `<button class="btn-icon install-btn" type="button" data-install-app hidden aria-label="Install the VibeHive app">${VH.icon("download")}</button>`],
      [".auth-card", "beforeend", `<button class="btn btn-ghost btn-block install-btn" type="button" data-install-app hidden>${VH.icon("download")} Install the VibeHive app</button>`],
    ];
    spots.forEach(([selector, where, html]) => document.querySelector(selector)?.insertAdjacentHTML(where, html));
  };

  const showButtons = () => document.querySelectorAll("[data-install-app]").forEach((b) => (b.hidden = false));
  const hideButtons = () => document.querySelectorAll("[data-install-app]").forEach((b) => (b.hidden = true));

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // use our own button instead of the mini-infobar
    deferredPrompt = event;
    showButtons();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideButtons();
    VH.toast("VibeHive is on your home screen 🐝");
  });

  document.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-install-app]")) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") hideButtons();
      deferredPrompt = null;
    } else if (isIOS) {
      VH.openModal({
        title: "Install VibeHive",
        size: "modal-sm",
        body: `
          <ol class="install-steps">
            <li>Tap the <strong>Share</strong> button <span class="ios-share">⬆︎</span> in Safari's toolbar.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>, then open VibeHive from your home screen 🐝</li>
          </ol>`,
      });
    }
  });

  const start = () => {
    makeButtons();
    if (isIOS || deferredPrompt) showButtons(); // iOS never fires beforeinstallprompt
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
