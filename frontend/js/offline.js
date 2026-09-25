/* offline.js — the "you're offline" page retries as soon as the connection is back */
document.getElementById("retry").addEventListener("click", () => location.reload());
window.addEventListener("online", () => location.reload());
