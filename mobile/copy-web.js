// Copies ../frontend into ./www so Capacitor can bundle it into the app.
// Run automatically by `npm run sync` – edit the frontend, never ./www.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "frontend");
const dest = path.join(__dirname, "www");
const skip = new Set(["sw.js"]); // the native app doesn't need the web service worker

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true, filter: (file) => !skip.has(path.basename(file)) });
console.log("Copied frontend → mobile/www");
