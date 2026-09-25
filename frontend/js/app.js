/* ==========================================================================
   app.js — shared VibeHive UI: helpers, theme, toasts, modals, app shell
   (sidebar, bottom nav, right sidebar), follow buttons, search and composer.
   Every page loads: api.js → app.js → posts.js → <page>.js
   ========================================================================== */

const VH = {};

/* --------------------------------------------------------------------------
   Constants
   -------------------------------------------------------------------------- */
VH.VIBES = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "hyped", emoji: "🔥", label: "Hyped" },
  { key: "inspired", emoji: "💡", label: "Inspired" },
  { key: "chill", emoji: "😌", label: "Chill" },
  { key: "grateful", emoji: "❤️", label: "Grateful" },
  { key: "focused", emoji: "🎯", label: "Focused" },
  { key: "funny", emoji: "😂", label: "Funny" },
  { key: "late_night", emoji: "🌙", label: "Late Night" },
  { key: "motivated", emoji: "🚀", label: "Motivated" },
];
VH.MAX_POST_LENGTH = 500;
VH.MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/* --------------------------------------------------------------------------
   Icons (Lucide-style strokes) + logo
   -------------------------------------------------------------------------- */
const ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  chats: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
};

VH.icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

let logoCount = 0;
// VibeHive's mascot: a cute bee in a honeycomb cell.
// Each copy gets its own ids – duplicate SVG ids break when one copy is hidden.
VH.logo = (cls = "brand-logo", id = `vh-bee-${++logoCount}`) => `
  <svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
    <linearGradient id="${id}-cell" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#9A5680"/><stop offset="1" stop-color="#3E3D73"/>
    </linearGradient>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE37E"/><stop offset="1" stop-color="#F5B13A"/>
    </linearGradient>
    <clipPath id="${id}-clip"><ellipse cx="32" cy="38" rx="15.5" ry="14.5"/></clipPath>
    </defs>
    <!-- honeycomb cell -->
    <path d="M32 4.5 55.8 18.25v27.5L32 59.5 8.2 45.75v-27.5Z" fill="url(#${id}-cell)" stroke="#F6C766" stroke-width="3.5" stroke-linejoin="round"/>
    <g transform="rotate(-7 32 36)">
    <!-- wings -->
    <ellipse cx="20.5" cy="24" rx="8.5" ry="6.2" transform="rotate(-28 20.5 24)" fill="#FFFFFF" fill-opacity="0.9"/>
    <ellipse cx="43.5" cy="24" rx="8.5" ry="6.2" transform="rotate(28 43.5 24)" fill="#FFFFFF" fill-opacity="0.9"/>
    <ellipse cx="19" cy="22.5" rx="3" ry="1.6" transform="rotate(-28 19 22.5)" fill="#DDEBFF"/>
    <ellipse cx="45" cy="22.5" rx="3" ry="1.6" transform="rotate(28 45 22.5)" fill="#DDEBFF"/>
    <!-- antennae -->
    <path d="M27.5 25.5C26 19.5 23.5 16.5 20.5 15.5" fill="none" stroke="#2B1D3A" stroke-width="2.3" stroke-linecap="round"/>
    <path d="M36.5 25.5C38 19.5 40.5 16.5 43.5 15.5" fill="none" stroke="#2B1D3A" stroke-width="2.3" stroke-linecap="round"/>
    <circle cx="20" cy="15.2" r="2.9" fill="#FF8FA3"/>
    <circle cx="44" cy="15.2" r="2.9" fill="#FF8FA3"/>
    <!-- body -->
    <ellipse cx="32" cy="38" rx="15.5" ry="14.5" fill="url(#${id}-body)"/>
    <g clip-path="url(#${id}-clip)" fill="#2B1D3A">
    <rect x="12" y="42.2" width="40" height="3.6" rx="1.8"/>
    <rect x="12" y="48" width="40" height="3.2" rx="1.6"/>
    </g>
    <!-- shine -->
    <ellipse cx="24.5" cy="29" rx="4" ry="2.2" transform="rotate(-30 24.5 29)" fill="#FFFFFF" fill-opacity="0.55"/>
    <!-- eyes -->
    <ellipse cx="26.2" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/>
    <ellipse cx="37.8" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/>
    <circle cx="27.4" cy="33.6" r="1.3" fill="#FFFFFF"/>
    <circle cx="39" cy="33.6" r="1.3" fill="#FFFFFF"/>
    <circle cx="25.4" cy="36.6" r="0.6" fill="#FFFFFF"/>
    <circle cx="37" cy="36.6" r="0.6" fill="#FFFFFF"/>
    <!-- cheeks -->
    <ellipse cx="21.6" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3" fill-opacity="0.85"/>
    <ellipse cx="42.4" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3" fill-opacity="0.85"/>
    <!-- smile -->
    <path d="M29.2 39.4q2.8 2.8 5.6 0" fill="none" stroke="#2B1D3A" stroke-width="1.9" stroke-linecap="round"/>
    </g>
    <!-- sparkle -->
    <path d="M50 11.5l1.1 2.6 2.6 1.1-2.6 1.1-1.1 2.6-1.1-2.6-2.6-1.1 2.6-1.1z" fill="#FFF3C4"/>
  </svg>`;

/* --------------------------------------------------------------------------
   Small helpers
   -------------------------------------------------------------------------- */
VH.esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

VH.qs = (sel, root = document) => root.querySelector(sel);
VH.qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

VH.html = (markup) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild;
};

VH.debounce = (fn, wait = 250) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

VH.displayName = (user) => (user && (user.full_name || user.username)) || "Someone";
VH.firstName = (user) => VH.displayName(user).split(" ")[0];
VH.profileUrl = (user) => (user.is_me ? "profile.html" : `profile.html?id=${user.id}`);

VH.compact = (n) => {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1e6) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
};

VH.timeAgo = (iso) => {
  const date = new Date(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
};

VH.fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

VH.joinDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

/** Escape user text, then turn #hashtags and links into anchors. */
VH.richText = (text) =>
  VH.esc(text)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="hashtag">$1</a>')
    .replace(/(^|\s)#(\w{2,30})/g, '$1<a class="hashtag" href="explore.html?tag=$2">#$2</a>');

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#F0B64A,#DE7A55)",
  "linear-gradient(135deg,#DE7A55,#8A4E73)",
  "linear-gradient(135deg,#8A4E73,#3E3D73)",
  "linear-gradient(135deg,#3A9E9B,#3E3D73)",
  "linear-gradient(135deg,#E8A33D,#8A4E73)",
  "linear-gradient(135deg,#5A55A8,#3A9E9B)",
  "linear-gradient(135deg,#D6455D,#8A4E73)",
];

/** Avatar: the uploaded photo, or colorful initials generated from the username. */
VH.avatar = (user, size = 44) => {
  if (!user) return "";
  const name = VH.displayName(user);
  const style = `--size:${size}px`;
  if (user.avatar) {
    return `<span class="avatar" style="${style}"><img src="${VH.esc(user.avatar)}" alt="${VH.esc(name)}" loading="lazy"></span>`;
  }
  const words = name.trim().split(/\s+/);
  const initials = (words.length > 1 ? words[0][0] + words[words.length - 1][0] : name.slice(0, 1)) || "?";
  let hash = 0;
  for (const ch of user.username || name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return `<span class="avatar" style="${style};--avatar-bg:${bg}" aria-label="${VH.esc(name)}">${VH.esc(initials)}</span>`;
};

VH.vibeBadge = (vibe) =>
  vibe ? `<span class="vibe-badge vibe-${VH.esc(vibe.key)}">${vibe.emoji} ${VH.esc(vibe.label)}</span>` : "";

VH.emptyState = ({ emoji = "🐝", title, text = "", action = "" }) => `
  <div class="empty-state">
    <div class="empty-hex">${emoji}</div>
    <h3>${title}</h3>
    ${text ? `<p>${text}</p>` : ""}
    ${action}
  </div>`;

VH.setLoading = (button, loading, text) => {
  if (loading) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span>${text ? `<span>${text}</span>` : ""}`;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.innerHTML = button.dataset.label;
  }
};

/**
 * Phone cameras make 4–12 MB photos. Resize anything big to max 1600px JPEG
 * so uploads are fast and stay under the 5 MB limit. GIFs are left alone.
 */
VH.shrinkImage = async (file, maxSide = 1600) => {
  if (!file || !file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 1.2 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // old browser – upload the original
  }
};

/** Live camera (desktop/laptop webcams). Resolves with a photo File, or null if cancelled. */
VH.openCamera = () => new Promise((resolve) => {
  let stream = null;
  let facing = "user";
  let done = false;
  const body = VH.html(`
    <div class="camera">
      <div class="camera-view">
        <video autoplay playsinline muted></video>
        <p class="camera-msg">Starting camera…</p>
      </div>
      <div class="camera-controls">
        <button class="btn btn-ghost" type="button" data-cam-cancel>Cancel</button>
        <button class="camera-shutter" type="button" data-cam-shoot aria-label="Take photo" disabled></button>
        <button class="btn btn-ghost" type="button" data-cam-flip title="Switch camera" hidden>${VH.icon("camera", "icon-sm")} Flip</button>
      </div>
    </div>`);
  const video = VH.qs("video", body);
  const msg = VH.qs(".camera-msg", body);
  const shoot = VH.qs("[data-cam-shoot]", body);
  const flip = VH.qs("[data-cam-flip]", body);

  const stop = () => stream?.getTracks().forEach((t) => t.stop());
  const finish = (file) => { if (done) return; done = true; stop(); resolve(file); };
  const modal = VH.openModal({ title: "Take a photo 📸", body, onClose: () => finish(null) });

  async function start() {
    stop();
    shoot.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1600 } }, audio: false });
      video.srcObject = stream;
      video.classList.toggle("mirror", facing === "user");
      msg.hidden = true;
      shoot.disabled = false;
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      flip.hidden = cams.length < 2;
    } catch (err) {
      msg.hidden = false;
      msg.textContent = err.name === "NotAllowedError"
        ? "Camera permission was blocked. Allow the camera in your browser's address bar, then try again."
        : "No camera found on this device. You can still add a photo from your gallery.";
    }
  }

  shoot.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (facing === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } // keep the selfie as you saw it
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      finish(blob ? new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }) : null);
      modal.close();
    }, "image/jpeg", 0.88);
  });
  flip.addEventListener("click", () => { facing = facing === "user" ? "environment" : "user"; start(); });
  VH.qs("[data-cam-cancel]", body).addEventListener("click", () => modal.close());
  start();
});

/** Validate an image picked by the user before uploading it. */
VH.checkImage = (file) => {
  if (!file) return null;
  if (!file.type.startsWith("image/")) return "Please choose an image file (JPG, PNG, GIF or WebP).";
  if (file.size > VH.MAX_UPLOAD_BYTES) return "That image is larger than 5 MB. Try a smaller one.";
  return null;
};

/* --------------------------------------------------------------------------
   Sounds 🔔 – short tones made with the Web Audio API (no sound files needed).
   Browsers only allow sound after the first tap/click on the page, so the
   audio engine is "unlocked" on the first interaction. On phones a short
   vibration plays too. Can be switched off in the 👥 Account menu.
   -------------------------------------------------------------------------- */
VH.SOUND_KEY = "vh_sound";
VH.soundOn = () => { try { return localStorage.getItem(VH.SOUND_KEY) !== "off"; } catch { return true; } };
let audioCtx = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch { /* no Web Audio */ }
}
["pointerdown", "keydown", "touchstart"].forEach((type) => document.addEventListener(type, unlockAudio, { passive: true }));

const TONES = {
  message: [[880, 0, 0.09], [1320, 0.1, 0.14]],               // bright two-note "bloop"
  notify: [[660, 0, 0.12], [990, 0.12, 0.12], [1320, 0.24, 0.18]], // soft rising chime
  sent: [[1200, 0, 0.06]],                                     // tiny tick when you send
};
VH.sound = (kind = "notify") => {
  if (!VH.soundOn()) return;
  if (kind !== "sent") navigator.vibrate?.(kind === "message" ? [40, 60, 40] : 60);
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  (TONES[kind] || TONES.notify).forEach(([freq, start, length]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(kind === "sent" ? 0.05 : 0.14, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + start);
    osc.stop(now + start + length + 0.02);
  });
};

/* --------------------------------------------------------------------------
   Theme
   -------------------------------------------------------------------------- */
VH.toggleTheme = () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("vh_theme", next); } catch { /* ignore */ }
};

VH.themeButton = (cls = "btn-icon") =>
  `<button class="${cls} theme-toggle" type="button" data-action="toggle-theme" aria-label="Toggle dark mode" title="Toggle dark mode">
     ${VH.icon("sun", "icon-sun")}${VH.icon("moon", "icon-moon")}
   </button>`;

/* --------------------------------------------------------------------------
   Toasts (+ a "flash" toast that survives a page redirect)
   -------------------------------------------------------------------------- */
VH.toast = (message, type = "success", { href = "", duration } = {}) => {
  let stack = VH.qs(".toast-stack");
  if (!stack) {
    stack = VH.html('<div class="toast-stack" role="status" aria-live="polite"></div>');
    document.body.appendChild(stack);
  }
  const icon = type === "error" ? "alert" : type === "notify" ? "bell" : "check";
  const tag = href ? "a" : "div";
  const toast = VH.html(`<${tag} class="toast ${type}" ${href ? `href="${VH.esc(href)}"` : ""}>
      <span class="toast-icon">${VH.icon(icon)}</span><span>${VH.esc(message)}</span></${tag}>`);
  stack.appendChild(toast);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration || (type === "error" ? 4200 : type === "notify" ? 6000 : 2800));
};

VH.flash = (message) => {
  try { sessionStorage.setItem("vh_flash", message); } catch { /* ignore */ }
};

function showFlash() {
  try {
    const message = sessionStorage.getItem("vh_flash");
    if (message) {
      sessionStorage.removeItem("vh_flash");
      setTimeout(() => VH.toast(message), 250);
    }
  } catch { /* ignore */ }
}

/* --------------------------------------------------------------------------
   Modals, confirm dialog, image lightbox
   -------------------------------------------------------------------------- */
VH.openModal = ({ title = "", body, size = "", onClose } = {}) => {
  const backdrop = VH.html(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${VH.esc(title)}">
      <div class="modal ${size}">
        <div class="modal-head">
          <h2>${VH.esc(title)}</h2>
          <button class="btn-icon" type="button" data-close aria-label="Close">${VH.icon("x")}</button>
        </div>
        <div class="modal-body"></div>
      </div>
    </div>`);
  const content = VH.qs(".modal-body", backdrop);
  if (typeof body === "string") content.innerHTML = body;
  else if (body) content.appendChild(body);

  const previousFocus = document.activeElement;
  const close = () => {
    if (backdrop.classList.contains("closing")) return;
    document.removeEventListener("keydown", onKey);
    backdrop.classList.add("closing");
    backdrop.addEventListener("animationend", () => backdrop.remove(), { once: true });
    setTimeout(() => backdrop.remove(), 300);
    document.body.style.overflow = "";
    previousFocus?.focus?.();
    onClose?.();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  VH.qs("[data-close]", backdrop).addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";
  setTimeout(() => VH.qs("textarea, input:not([type=file]), button:not([data-close])", content)?.focus(), 60);
  return { el: backdrop, body: content, close };
};

VH.confirm = (message, { title = "Are you sure?", confirmText = "Delete", danger = true } = {}) =>
  new Promise((resolve) => {
    let answered = false;
    const body = VH.html(`
      <div>
        <p class="confirm-text">${VH.esc(message)}</p>
        <div class="modal-footer">
          <button class="btn btn-outline" type="button" data-no>Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-yes>${VH.esc(confirmText)}</button>
        </div>
      </div>`);
    const modal = VH.openModal({ title, body, size: "modal-sm", onClose: () => { if (!answered) resolve(false); } });
    VH.qs("[data-no]", body).addEventListener("click", () => modal.close());
    VH.qs("[data-yes]", body).addEventListener("click", () => { answered = true; resolve(true); modal.close(); });
  });

VH.lightbox = (src) => {
  const box = VH.html(`<div class="modal-backdrop lightbox"><img src="${VH.esc(src)}" alt="Post image"></div>`);
  const close = () => { box.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  box.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(box);
};

/* --------------------------------------------------------------------------
   Auth guard + current user
   -------------------------------------------------------------------------- */
VH.me = null;

/** Redirect to the login page when there is no token. Returns false in that case. */
VH.requireAuth = () => {
  if (!API.session.token) {
    location.replace(`login.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}`);
    return false;
  }
  VH.me = API.session.user || {};
  return true;
};

/** Refresh the logged-in user's data from the API and update the shell. */
VH.refreshMe = async () => {
  try {
    VH.me = await API.get("/profile/");
    API.session.setUser(VH.me);
    renderMeCard();
  } catch { /* the 401 handler in api.js redirects when needed */ }
  return VH.me;
};

VH.logout = async () => {
  try { await API.post("/logout/"); } catch { /* token may already be invalid */ }
  API.session.clear(); // the account stays in the saved list, but needs the password again
  VH.flash("You left the hive for now. See you soon 👋");
  location.href = "login.html";
};

/* --------------------------------------------------------------------------
   Saved accounts: switch between everyone who logged in on this device
   -------------------------------------------------------------------------- */
VH.switchTo = async (account) => {
  const relogin = () => { location.href = `login.html?switch=1&u=${encodeURIComponent(account.username)}`; };
  if (!account.token) return relogin();
  try {
    const me = await API.request("/profile/", { token: account.token });
    API.session.save(account.token, me);
    VH.flash(`Switched to ${VH.firstName(me)} 🐝`);
    location.href = "index.html";
  } catch (err) {
    if (err.status === 401) { API.accounts.forgetToken(account.id); relogin(); }
    else VH.toast(err.message, "error");
  }
};

function closeAccountMenu() {
  VH.qsa(".account-menu").forEach((m) => m.remove());
}

function openAccountMenu(button) {
  if (VH.qs(".account-menu", button.parentElement)) return closeAccountMenu();
  closeAccountMenu();
  const me = VH.me || {};
  const others = API.accounts.list().filter((a) => a.id !== me.id);
  const row = (a, extra = "") => `
    ${VH.avatar(a, 36)}
    <span class="meta"><span class="name">${VH.esc(VH.displayName(a))}</span><span class="handle">@${VH.esc(a.username)}</span></span>${extra}`;
  const menu = VH.html(`
    <div class="menu account-menu ${button.closest(".sidebar") ? "menu-up" : ""}" role="menu">
      <p class="menu-label">Signed in as</p>
      <a class="account-item current" href="profile.html" role="menuitem">${row(me, VH.icon("check", "icon-sm"))}</a>
      ${others.length ? `<p class="menu-label">Switch account</p>` + others.map((a) => `
        <button class="account-item" type="button" role="menuitem" data-switch-account="${a.id}">
          ${row(a, a.token ? "" : '<span class="needs-login">Log in</span>')}
        </button>`).join("") : ""}
      <div class="menu-sep"></div>
      <button type="button" role="menuitem" data-account-action="sound">${VH.icon("bell", "icon-sm")} Sounds: ${VH.soundOn() ? "On 🔔" : "Off 🔕"}</button>
      <button type="button" role="menuitem" data-account-action="add">${VH.icon("userPlus", "icon-sm")} Add another account</button>
      <button type="button" role="menuitem" class="danger" data-account-action="logout">${VH.icon("logout", "icon-sm")} Log out @${VH.esc(me.username || "")}</button>
    </div>`);
  button.parentElement.appendChild(menu);
  menu.addEventListener("click", (e) => {
    const target = e.target.closest("[data-switch-account], [data-account-action]");
    if (!target) return;
    closeAccountMenu();
    if (target.dataset.switchAccount) VH.switchTo(others.find((a) => String(a.id) === target.dataset.switchAccount));
    if (target.dataset.accountAction === "add") { API.session.leave(); location.href = "login.html?switch=1&add=1"; }
    if (target.dataset.accountAction === "logout") VH.logout();
    if (target.dataset.accountAction === "sound") {
      const on = !VH.soundOn();
      try { localStorage.setItem(VH.SOUND_KEY, on ? "on" : "off"); } catch { /* ignore */ }
      VH.toast(on ? "Sounds on 🔔" : "Sounds off 🔕");
      if (on) { unlockAudio(); setTimeout(() => VH.sound("notify"), 60); }
    }
  });
}

/* --------------------------------------------------------------------------
   Follow buttons (work anywhere on the page via event delegation)
   -------------------------------------------------------------------------- */
VH.followButton = (user, size = "btn-sm") => {
  if (!user || user.is_me) return "";
  const following = !!user.is_following;
  return `<button class="btn btn-ink btn-follow ${size} ${following ? "is-following" : ""}" type="button"
            data-follow-user="${user.id}" data-username="${VH.esc(user.username)}" aria-pressed="${following}">
            ${following ? '<span class="label-following">Following</span><span class="label-unfollow">Unfollow</span>' : "Follow"}
          </button>`;
};

function setFollowState(userId, following) {
  VH.qsa(`[data-follow-user="${userId}"]`).forEach((btn) => {
    btn.classList.toggle("is-following", following);
    btn.setAttribute("aria-pressed", following);
    btn.innerHTML = following
      ? '<span class="label-following">Following</span><span class="label-unfollow">Unfollow</span>'
      : "Follow";
  });
}

async function handleFollowClick(btn) {
  const userId = btn.dataset.followUser;
  const wasFollowing = btn.classList.contains("is-following");
  const buttons = VH.qsa(`[data-follow-user="${userId}"]`);
  buttons.forEach((b) => (b.disabled = true));
  setFollowState(userId, !wasFollowing); // optimistic update
  btn.classList.remove("pop");
  void btn.offsetWidth;
  btn.classList.add("pop");
  try {
    const result = wasFollowing
      ? await API.del(`/users/${userId}/follow/`)
      : await API.post(`/users/${userId}/follow/`);
    VH.toast(
      result.mutual ? "You follow each other now — you can see each other's vibes 🐝" :
      result.following ? "Followed! You'll see their posts once they follow you back 🐝" :
      "You left their hive."
    );
    document.dispatchEvent(new CustomEvent("vh:follow-changed", {
      detail: {
        userId: Number(userId), following: result.following,
        followersCount: result.followers_count, mutual: !!result.mutual,
      },
    }));
    VH.refreshMe();
  } catch (err) {
    setFollowState(userId, wasFollowing);
    VH.toast(err.message, "error");
  } finally {
    VH.qsa(`[data-follow-user="${userId}"]`).forEach((b) => (b.disabled = false));
  }
}

/* --------------------------------------------------------------------------
   Reusable people markup
   -------------------------------------------------------------------------- */
VH.userRow = (user, { bio = false, follow = true } = {}) => `
  <div class="user-row">
    <a href="${VH.profileUrl(user)}">${VH.avatar(user, 44)}</a>
    <a class="meta" href="${VH.profileUrl(user)}">
      <span class="name">${VH.esc(VH.displayName(user))}</span>
      <span class="handle">@${VH.esc(user.username)}</span>
      ${bio && user.bio ? `<span class="bio">${VH.esc(user.bio)}</span>` : ""}
    </a>
    ${follow ? VH.followButton(user) : ""}
  </div>`;

VH.userCard = (user) => `
  <div class="card user-card">
    <div class="cover"></div>
    <a href="${VH.profileUrl(user)}">${VH.avatar(user, 64)}</a>
    <a class="name" href="${VH.profileUrl(user)}">${VH.esc(VH.displayName(user))}</a>
    <span class="handle">@${VH.esc(user.username)}</span>
    <p class="bio">${VH.esc(user.bio || "New to the hive — say hi! 👋")}</p>
    <span class="followers">${VH.compact(user.followers_count)} ${user.followers_count === 1 ? "follower" : "followers"}</span>
    ${VH.followButton(user)}
  </div>`;

VH.skeletonRows = (n = 3) =>
  Array.from({ length: n }, () => `
    <div class="user-row"><span class="skeleton sk-circle"></span>
      <div class="meta"><div class="skeleton sk-line" style="width:60%;margin:0"></div><div class="skeleton sk-line" style="width:40%"></div></div>
    </div>`).join("");

/* --------------------------------------------------------------------------
   User search (dropdown in the right sidebar)
   -------------------------------------------------------------------------- */
VH.searchUsers = async (query) => {
  const data = await API.get(`/search/users/?q=${encodeURIComponent(query)}`);
  return data.results;
};

VH.noResults = () =>
  `<div class="empty-mini"><strong>No one found in the hive.</strong>Try another search.</div>`;

function attachSearchDropdown(input, results) {
  let lastQuery = "";
  const run = VH.debounce(async () => {
    const query = input.value.trim();
    lastQuery = query;
    if (!query) { results.classList.remove("open"); return; }
    results.innerHTML = VH.skeletonRows(2);
    results.classList.add("open");
    try {
      const users = await VH.searchUsers(query);
      if (query !== lastQuery) return; // a newer search is on its way
      results.innerHTML = users.length ? users.slice(0, 8).map((u) => VH.userRow(u)).join("") : VH.noResults();
    } catch (err) {
      results.innerHTML = `<div class="empty-mini">${VH.esc(err.message)}</div>`;
    }
  });
  input.addEventListener("input", run);
  input.addEventListener("focus", () => { if (input.value.trim()) results.classList.add("open"); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { results.classList.remove("open"); input.blur(); }
    if (e.key === "Enter" && input.value.trim()) location.href = `explore.html?q=${encodeURIComponent(input.value.trim())}`;
  });
  document.addEventListener("click", (e) => {
    if (!results.contains(e.target) && e.target !== input) results.classList.remove("open");
  });
}

/* --------------------------------------------------------------------------
   Post composer (inline on the feed and inside the "Create post" modal)
   -------------------------------------------------------------------------- */
VH.buildComposer = ({ inModal = false, onPosted } = {}) => {
  const me = VH.me || {};
  const form = VH.html(`
    <form class="card composer ${inModal ? "" : "composer-inline"}" novalidate>
      <div class="composer-top">
        ${VH.avatar(me, 46)}
        <div class="composer-body">
          <label class="sr-only" for="c-${inModal ? "m" : "i"}">Post text</label>
          <textarea id="c-${inModal ? "m" : "i"}" name="content" rows="2" maxlength="${VH.MAX_POST_LENGTH}"
            placeholder="What's buzzing in your mind?"></textarea>
          <div class="image-preview hidden">
            <img alt="Selected image preview">
            <button class="btn-icon" type="button" data-remove-image aria-label="Remove image">${VH.icon("x")}</button>
          </div>
          <div class="vibe-picker" role="radiogroup" aria-label="Pick a vibe">
            ${VH.VIBES.map((v) => `
              <button type="button" class="vibe-chip vibe-${v.key}" role="radio" aria-checked="false" data-vibe="${v.key}">
                <span class="emo">${v.emoji}</span>${v.label}
              </button>`).join("")}
          </div>
        </div>
      </div>
      <div class="composer-footer">
        <div class="composer-tools">
          <label class="btn-icon" title="Add a photo from your gallery" aria-label="Add a photo from your gallery">
            ${VH.icon("image")}
            <input type="file" name="image" accept="image/*" hidden data-gallery-input>
          </label>
          <button class="btn-icon" type="button" data-camera title="Take a photo" aria-label="Take a photo with the camera">
            ${VH.icon("camera")}
          </button>
          <input type="file" accept="image/*" capture="environment" hidden data-camera-input>
          <span class="hint vibe-hint">Pick a vibe ✨</span>
        </div>
        <div class="composer-submit">
          <span class="audience" title="Only people you follow each other with can see your posts">🔒 Mutual followers</span>
          <span class="char-count">0/${VH.MAX_POST_LENGTH}</span>
          <button class="btn btn-primary" type="submit" disabled>Post</button>
        </div>
      </div>
      <p class="composer-error" role="alert"></p>
    </form>`);

  const textarea = VH.qs("textarea", form);
  const fileInput = VH.qs("[data-gallery-input]", form);
  const cameraInput = VH.qs("[data-camera-input]", form);
  const preview = VH.qs(".image-preview", form);
  const counter = VH.qs(".char-count", form);
  const submit = VH.qs("button[type=submit]", form);
  const errorEl = VH.qs(".composer-error", form);
  const hint = VH.qs(".vibe-hint", form);
  let vibe = "";
  let imageFile = null;

  const update = () => {
    const length = textarea.value.length;
    counter.textContent = `${length}/${VH.MAX_POST_LENGTH}`;
    counter.classList.toggle("warn", length > VH.MAX_POST_LENGTH - 60);
    counter.classList.toggle("over", length >= VH.MAX_POST_LENGTH);
    submit.disabled = !textarea.value.trim() && !imageFile;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
  };

  textarea.addEventListener("input", () => { errorEl.textContent = ""; update(); });
  textarea.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !submit.disabled) form.requestSubmit();
  });

  VH.qs(".vibe-picker", form).addEventListener("click", (e) => {
    const chip = e.target.closest(".vibe-chip");
    if (!chip) return;
    vibe = vibe === chip.dataset.vibe ? "" : chip.dataset.vibe;
    VH.qsa(".vibe-chip", form).forEach((c) => {
      const selected = c.dataset.vibe === vibe;
      c.classList.toggle("selected", selected);
      c.setAttribute("aria-checked", selected);
    });
    const picked = VH.VIBES.find((v) => v.key === vibe);
    hint.textContent = picked ? `Feeling ${picked.label.toLowerCase()} ${picked.emoji}` : "Pick a vibe ✨";
  });

  async function setImage(original) {
    if (!original) return;
    if (!original.type.startsWith("image/")) { errorEl.textContent = VH.checkImage(original); return; }
    errorEl.textContent = "Preparing photo…";
    const file = await VH.shrinkImage(original);
    const problem = VH.checkImage(file);
    if (problem) { errorEl.textContent = problem; return; }
    imageFile = file;
    errorEl.textContent = "";
    VH.qs("img", preview).src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
    update();
  }

  // Gallery
  fileInput.addEventListener("change", () => { setImage(fileInput.files[0]); fileInput.value = ""; });

  // Camera: phones/tablets open the camera app; laptops get a live webcam preview
  cameraInput.addEventListener("change", () => { setImage(cameraInput.files[0]); cameraInput.value = ""; });
  VH.qs("[data-camera]", form).addEventListener("click", async () => {
    const isTouch = matchMedia("(pointer: coarse)").matches;
    if (isTouch || !navigator.mediaDevices?.getUserMedia) {
      cameraInput.click();
    } else {
      setImage(await VH.openCamera());
    }
  });

  VH.qs("[data-remove-image]", form).addEventListener("click", () => {
    imageFile = null;
    fileInput.value = "";
    preview.classList.add("hidden");
    update();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = textarea.value.trim();
    if (!content && !imageFile) { errorEl.textContent = "Your post can't be empty."; return; }
    const data = new FormData();
    data.append("content", content);
    if (vibe) data.append("vibe", vibe);
    if (imageFile) data.append("image", imageFile);

    VH.setLoading(submit, true);
    try {
      const post = await API.post("/posts/", data);
      VH.toast("Your vibe is live! 🔥");
      form.reset();
      textarea.value = "";
      imageFile = null;
      preview.classList.add("hidden");
      if (vibe) VH.qs(`.vibe-chip[data-vibe="${vibe}"]`, form).click();
      document.dispatchEvent(new CustomEvent("vh:post-created", { detail: post }));
      onPosted?.(post);
      VH.refreshMe();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      VH.setLoading(submit, false);
      update();
    }
  });

  update();
  return form;
};

VH.openComposer = () => {
  let modal;
  const composer = VH.buildComposer({ inModal: true, onPosted: () => modal.close() });
  modal = VH.openModal({ title: "Share something with the hive", body: composer });
};

/* --------------------------------------------------------------------------
   App shell: left sidebar, mobile top bar, bottom nav, right sidebar
   -------------------------------------------------------------------------- */
const NAV_ITEMS = [
  { key: "home", href: "index.html", icon: "home", label: "Home" },
  { key: "explore", href: "explore.html", icon: "compass", label: "Explore" },
  { key: "messages", href: "messages.html", icon: "chats", label: "Messages" },
  { key: "notifications", href: "notifications.html", icon: "bell", label: "Notifications" },
  { key: "profile", href: "profile.html", icon: "user", label: "Profile" },
];

function renderMeCard() {
  const me = VH.me;
  const card = VH.qs("[data-me-card]");
  if (!card || !me) return;
  card.innerHTML = `
    ${VH.avatar(me, 40)}
    <span class="meta"><span class="name">${VH.esc(VH.displayName(me))}</span><span class="handle">@${VH.esc(me.username)}</span></span>`;
}

function renderSidebar(active) {
  const sidebar = VH.qs("#sidebar");
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-inner">
      <a class="brand" href="index.html" aria-label="VibeHive home">${VH.logo()}<span class="brand-name">Vibe<span>Hive</span></span></a>
      <nav class="nav" aria-label="Main">
        ${NAV_ITEMS.map((item) => `
          <a class="nav-link ${item.key === active ? "active" : ""}" href="${item.href}" ${item.key === active ? 'aria-current="page"' : ""}>
            ${VH.icon(item.icon)}<span class="label">${item.label}</span>
            ${item.key === "notifications" ? '<span class="nav-dot" data-notif-dot></span>' : ""}
            ${item.key === "messages" ? '<span class="nav-dot" data-chat-dot></span>' : ""}
          </a>`).join("")}
      </nav>
      <button class="btn btn-primary btn-create" type="button" data-action="compose" title="Create post (N)">
        ${VH.icon("plus")}<span class="label">Create Post</span>
      </button>
      <div class="sidebar-footer">
        <a class="me-card" href="profile.html" data-me-card></a>
        <div class="sidebar-actions">
          <button class="btn btn-outline btn-sm theme-toggle" type="button" data-action="toggle-theme" title="Toggle dark mode">
            ${VH.icon("sun", "icon-sun")}${VH.icon("moon", "icon-moon")}<span class="label">Theme</span>
          </button>
          <button class="btn btn-outline btn-sm" type="button" data-action="account" title="Switch account or log out" aria-haspopup="true">
            ${VH.icon("users")}<span class="label">Account</span>
          </button>
        </div>
      </div>
    </div>`;
  renderMeCard();
}

function renderMobileChrome(active) {
  const top = VH.html(`
    <header class="mobile-top">
      <a class="brand" href="index.html">${VH.logo()}<span class="brand-name">Vibe<span>Hive</span></span></a>
      <div class="mobile-top-actions">
        ${VH.themeButton()}
        <a class="btn-icon notif-link" href="notifications.html" aria-label="Notifications">${VH.icon("bell")}<span class="nav-dot" data-notif-dot></span></a>
        <button class="btn-icon" type="button" data-action="account" aria-label="Switch account or log out" aria-haspopup="true">${VH.icon("users")}</button>
      </div>
    </header>`);
  document.body.prepend(top);

  const item = (key, href, icon, label, dot = "") =>
    `<a class="${key === active ? "active" : ""}" href="${href}">${VH.icon(icon)}<span>${label}</span>${dot}</a>`;
  document.body.appendChild(VH.html(`
    <nav class="bottom-nav" aria-label="Mobile">
      ${item("home", "index.html", "home", "Home")}
      ${item("explore", "explore.html", "compass", "Explore")}
      <button class="bn-post" type="button" data-action="compose"><span class="bn-post-icon">${VH.icon("plus")}</span><span>Post</span></button>
      ${item("messages", "messages.html", "chats", "Chats", '<span class="nav-dot" data-chat-dot></span>')}
      ${item("profile", "profile.html", "user", "Profile")}
    </nav>`));
}

/** Right sidebar widgets. `parts` picks which ones a page shows. */
async function renderRightbar(parts) {
  const bar = VH.qs("#rightbar");
  if (!bar) return;
  bar.innerHTML = `
    <div class="rightbar-inner">
      ${parts.includes("search") ? `
        <div class="search">
          ${VH.icon("search")}
          <input class="input" type="search" placeholder="Search the hive..." aria-label="Search users" autocomplete="off">
          <div class="search-results"></div>
        </div>` : ""}
      ${parts.includes("matches") ? `
        <section class="card widget">
          <div class="widget-title"><span>🧬 Your vibe matches</span> <a href="explore.html#matches">See all</a></div>
          <div data-matches>${VH.skeletonRows(3)}</div>
        </section>` : ""}
      ${parts.includes("suggested") ? `
        <section class="card widget">
          <div class="widget-title">Suggested people <a href="explore.html">See all</a></div>
          <div data-suggested>${VH.skeletonRows(3)}</div>
        </section>` : ""}
      ${parts.includes("vibes") ? `
        <section class="card widget">
          <div class="widget-title">Trending vibes</div>
          <div class="trend-list" data-trending-vibes>${VH.skeletonRows(3)}</div>
        </section>` : ""}
      ${parts.includes("topics") ? `
        <section class="card widget">
          <div class="widget-title">Trending topics</div>
          <div class="trend-list" data-trending-topics>${VH.skeletonRows(2)}</div>
        </section>` : ""}
      ${parts.includes("info") ? `
        <section class="info-card">
          <h3>🐝 Welcome to VibeHive</h3>
          <p>Share the vibe. Join the hive. Post your mood, find your people and keep the buzz friendly.</p>
          <div class="info-stats" data-hive-stats></div>
        </section>` : ""}
      <p class="footer-links">© ${new Date().getFullYear()} VibeHive · Built with Django &amp; vanilla JS</p>
    </div>`;

  const search = VH.qs(".search", bar);
  if (search) attachSearchDropdown(VH.qs("input", search), VH.qs(".search-results", search));

  if (parts.includes("suggested")) loadSuggested(VH.qs("[data-suggested]", bar));
  if (parts.includes("matches") && VH.loadMatchesWidget) VH.loadMatchesWidget(VH.qs("[data-matches]", bar));
  if (parts.some((p) => ["vibes", "topics", "info"].includes(p))) loadTrending(bar);
}

async function loadSuggested(el) {
  try {
    const data = await API.get("/users/?suggested=1");
    el.innerHTML = data.results.length
      ? data.results.slice(0, 4).map((u) => VH.userRow(u)).join("")
      : `<p class="text-muted">You're following everyone in the hive! 🎉</p>`;
  } catch {
    el.innerHTML = `<p class="text-muted">Couldn't load suggestions.</p>`;
  }
}

VH.getTrending = (() => {
  let cached;
  return () => (cached = cached || API.get("/trending/").catch((err) => { cached = null; throw err; }));
})();

VH.trendingVibesHTML = (vibes) => {
  if (!vibes.length) return `<p class="text-muted">No vibes yet — be the first!</p>`;
  const max = Math.max(...vibes.map((v) => v.count));
  return vibes.map((v) => `
    <a class="trend-item vibe-${v.key}" href="explore.html?vibe=${v.key}">
      <div style="flex:1">
        <div class="t-name"><span class="t-emoji">${v.emoji}</span>${VH.esc(v.label)}</div>
        <div class="trend-bar"><span style="width:${Math.max(8, (v.count / max) * 100)}%"></span></div>
      </div>
      <span class="t-count">${v.count} ${v.count === 1 ? "post" : "posts"}</span>
    </a>`).join("");
};

VH.trendingTopicsHTML = (topics) => {
  if (!topics.length) return `<p class="text-muted">Use #hashtags in your posts to start a trend.</p>`;
  return topics.map((t, i) => `
    <a class="trend-item" href="explore.html?tag=${encodeURIComponent(t.tag)}">
      <div class="t-name"><span class="t-rank">${i + 1}</span>#${VH.esc(t.tag)}</div>
      <span class="t-count">${t.count} ${t.count === 1 ? "post" : "posts"}</span>
    </a>`).join("");
};

async function loadTrending(bar) {
  const vibesEl = VH.qs("[data-trending-vibes]", bar);
  const topicsEl = VH.qs("[data-trending-topics]", bar);
  const statsEl = VH.qs("[data-hive-stats]", bar);
  try {
    const data = await VH.getTrending();
    if (vibesEl) vibesEl.innerHTML = VH.trendingVibesHTML(data.vibes);
    if (topicsEl) topicsEl.innerHTML = VH.trendingTopicsHTML(data.topics);
    if (statsEl) {
      statsEl.innerHTML = `
        <div><strong>${VH.compact(data.stats.members)}</strong><span>members</span></div>
        <div><strong>${VH.compact(data.stats.posts)}</strong><span>vibes shared</span></div>
        <div><strong>${VH.compact(data.stats.posts_today)}</strong><span>today</span></div>`;
    }
  } catch {
    [vibesEl, topicsEl].forEach((el) => el && (el.innerHTML = `<p class="text-muted">Couldn't load trends.</p>`));
  }
}

/* --------------------------------------------------------------------------
   Live notifications
   While the app is open it checks for new activity every 20 seconds:
   • a number badge on the 🔔 bell (and in the browser tab title)
   • a pop-up for each new like, comment or follow ("… followed you back")
   Checking pauses while the tab/app is in the background.
   Everything is remembered per account, so switching accounts is safe.
   -------------------------------------------------------------------------- */
const LIVE_INTERVAL_MS = 20000;
VH.notifKey = (name) => `vh_notif_${name}_${VH.me?.id ?? API.session.user?.id ?? "anon"}`;
const readStamp = (key) => { try { return Number(localStorage.getItem(key) || 0); } catch { return 0; } };
const writeStamp = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* ignore */ } };
const stampOf = (item) => new Date(item.created_at).getTime();
const newestStamp = (items) => items.reduce((max, item) => Math.max(max, stampOf(item)), 0);

VH.liveMessage = (item) => {
  const who = VH.displayName(item.actor);
  if (item.type === "like") return `❤️ ${who} liked your post`;
  if (item.type === "comment") {
    const text = item.comment.length > 60 ? `${item.comment.slice(0, 60)}…` : item.comment;
    return `💬 ${who} commented: “${text}”`;
  }
  return item.actor.is_following
    ? `🤝 ${who} followed you back — you can now see each other's vibes`
    : `🐝 ${who} followed you — follow back to see each other's vibes`;
};

function setBadge(count) {
  const label = count > 9 ? "9+" : String(count);
  VH.qsa("[data-notif-dot]").forEach((dot) => {
    dot.textContent = count ? label : "";
    dot.classList.toggle("show", count > 0);
  });
  const title = document.title.replace(/^\(\d+\+?\) /, "");
  document.title = count ? `(${label}) ${title}` : title;
}

/** Called by the notifications page once everything is on screen. */
VH.markNotificationsSeen = (items) => {
  const newest = Math.max(newestStamp(items), readStamp(VH.notifKey("seen")));
  writeStamp(VH.notifKey("seen"), newest);
  writeStamp(VH.notifKey("toasted"), Math.max(newest, readStamp(VH.notifKey("toasted"))));
  setBadge(0);
};

async function checkNotifications() {
  if (!API.session.token) return;
  let items;
  try { items = await API.get("/notifications/"); } catch { return; } // offline etc. – try again later

  const onNotificationsPage = VH.activePage === "notifications";
  const seen = readStamp(VH.notifKey("seen"));
  let toasted = readStamp(VH.notifKey("toasted"));
  if (!toasted) {
    // First time on this device: don't replay old history as pop-ups
    toasted = Math.max(newestStamp(items), seen) || Date.now();
    writeStamp(VH.notifKey("toasted"), toasted);
  }

  const fresh = items.filter((item) => stampOf(item) > toasted).sort((a, b) => stampOf(a) - stampOf(b));
  if (fresh.length && !onNotificationsPage) {
    VH.sound("notify");
    if (fresh.length <= 2) {
      fresh.forEach((item) => VH.toast(VH.liveMessage(item), "notify", {
        href: item.post ? `post.html?id=${item.post.id}` : VH.profileUrl(item.actor),
      }));
    } else {
      VH.toast(`🔔 You have ${fresh.length} new notifications`, "notify", { href: "notifications.html" });
    }
  }
  if (fresh.length) writeStamp(VH.notifKey("toasted"), newestStamp(fresh));

  setBadge(onNotificationsPage ? 0 : items.filter((item) => stampOf(item) > seen).length);
  document.dispatchEvent(new CustomEvent("vh:notifications", { detail: items }));
}

/** Open (or create) the chat with a mutual follower and go to it. */
VH.startChat = async (userId, button) => {
  if (button) VH.setLoading(button, true);
  try {
    const conv = await API.post("/chats/", { user_id: userId });
    location.href = `chat.html?c=${conv.id}`;
  } catch (err) {
    VH.toast(err.message, "error");
    if (button) VH.setLoading(button, false);
  }
};

/* ---- Chat: unread badge on 💬 + a pop-up for each new message ---- */
const CHAT_INTERVAL_MS = 8000;

function setChatBadge(total) {
  const label = total > 9 ? "9+" : String(total);
  VH.qsa("[data-chat-dot]").forEach((dot) => {
    dot.textContent = total ? label : "";
    dot.classList.toggle("show", total > 0);
  });
}

VH.checkChats = async () => {
  if (!API.session.token) return;
  let data;
  try { data = await API.get("/chats/unread/"); } catch { return; }
  setChatBadge(data.total);
  const key = VH.notifKey("chat_toasted");
  let firstRun = true;
  try { firstRun = localStorage.getItem(key) === null; } catch { /* ignore */ }
  const lastToasted = readStamp(key); // id of the newest message already shown as a pop-up
  const newest = data.latest.reduce((max, m) => Math.max(max, m.id), lastToasted);
  if (!firstRun) { // first time on this device: don't replay old messages as pop-ups
    const fresh = data.latest.filter((m) => m.id > lastToasted && m.conversation !== VH.activeChat).reverse();
    if (fresh.length) VH.sound("message");
    if (VH.activePage !== "messages") {
      fresh.slice(-2).forEach((m) => {
        const text = m.preview.length > 60 ? `${m.preview.slice(0, 60)}…` : m.preview;
        VH.toast(`💬 ${VH.firstName(m.sender)}: ${text}`, "notify", { href: `chat.html?c=${m.conversation}` });
      });
    }
  }
  writeStamp(key, newest);
  document.dispatchEvent(new CustomEvent("vh:chats", { detail: data }));
};

let liveTimer = null;
let chatTimer = null;
function startLiveNotifications() {
  const tick = () => { if (document.visibilityState === "visible") checkNotifications(); };
  const chatTick = () => { if (document.visibilityState === "visible") VH.checkChats(); };
  clearInterval(liveTimer);
  clearInterval(chatTimer);
  liveTimer = setInterval(tick, LIVE_INTERVAL_MS);
  chatTimer = setInterval(chatTick, CHAT_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => { tick(); chatTick(); }); // check right away when you come back
  checkNotifications();
  VH.checkChats();
}

/* --------------------------------------------------------------------------
   Global event delegation
   -------------------------------------------------------------------------- */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".account-menu, [data-action='account']")) closeAccountMenu();
  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;
    if (action === "toggle-theme") VH.toggleTheme();
    if (action === "logout") VH.logout();
    if (action === "account") openAccountMenu(actionEl);
    if (action === "compose") VH.openComposer();
  }
  const followBtn = e.target.closest("[data-follow-user]");
  if (followBtn && !followBtn.disabled) {
    e.preventDefault();
    handleFollowClick(followBtn);
  }
});

// Press "n" anywhere (outside inputs) to write a new post
document.addEventListener("keydown", (e) => {
  if (e.key !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest("input, textarea, [contenteditable]") || VH.qs(".modal-backdrop")) return;
  if (!VH.qs("#sidebar")) return;
  e.preventDefault();
  VH.openComposer();
});

/* --------------------------------------------------------------------------
   Page bootstrap
   -------------------------------------------------------------------------- */
/**
 * Call once per app page. Renders the shell and returns the current user
 * (or null when the visitor is being sent to the login page).
 *   VH.initPage({ active: "home", rightbar: ["search", "suggested", "vibes", "topics", "info"] })
 */
VH.initPage = ({ active, rightbar = ["search", "matches", "suggested", "vibes", "topics", "info"] } = {}) => {
  if (!VH.requireAuth()) return null; // redirecting to the login page
  VH.activePage = active;
  renderSidebar(active);
  renderMobileChrome(active);
  renderRightbar(rightbar);
  showFlash();
  startLiveNotifications();
  VH.refreshMe();
  return VH.me;
};

VH.showFlash = showFlash;
