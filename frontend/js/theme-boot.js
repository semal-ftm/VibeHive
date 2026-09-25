/* Runs in <head> before the page paints:
   1. applies the saved light/dark theme (no colour flash)
   2. sends visitors to the right page BEFORE anything is shown, so logged-out
      people never glimpse the feed ("What's the vibe today?") and logged-in
      people never glimpse the login form. */
(function () {
  var page = location.pathname.split("/").pop() || "index.html";
  var isAuthPage = /^(login|register)\.html$/.test(page);
  var isPublicPage = isAuthPage || page === "offline.html";
  var token = null;
  try { token = localStorage.getItem("vh_token"); } catch (e) { /* storage blocked */ }

  if (!isPublicPage && !token) {
    document.documentElement.style.visibility = "hidden";
    location.replace("login.html?next=" + encodeURIComponent(page + location.search));
    return;
  }
  if (isAuthPage && token && !/[?&]switch=/.test(location.search)) {
    document.documentElement.style.visibility = "hidden";
    location.replace("index.html");
    return;
  }
})();

(function () {
  var theme = null;
  try { theme = localStorage.getItem("vh_theme"); } catch (e) { /* storage blocked */ }
  if (!theme) {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
