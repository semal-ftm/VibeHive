/* ==========================================================================
   auth-showcase.js — the animated left panel on the login/register pages
   1. Vibe picker demo : a post types itself, a finger picks a vibe, it posts
   2. Flying bee       : the mascot loops around and "likes" the new post
   3. Vibe bubbles     : emoji bubbles float up and pop
   On phones (where the big panel is hidden) a compact header shows the
   flying bee, a few bubbles and a vibe ticker above the form instead.
   Only runs when the panel is visible (it's hidden on phones) and stays
   still for people who turned on "reduce motion".
   ========================================================================== */

/* ---------------------------------------------------------------- phones: mini header */
(() => {
  const hero = document.querySelector("[data-mobile-hero]");
  if (!hero || getComputedStyle(hero).display === "none") return;      // desktop: big panel instead
  if (getComputedStyle(hero).position !== "relative") return;            // styles missing → show nothing
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TICKER = [
    ["hyped", "🔥 Hyped"], ["chill", "😌 Chill"], ["motivated", "🚀 Motivated"],
    ["grateful", "❤️ Grateful"], ["inspired", "💡 Inspired"], ["late_night", "🌙 Late Night"],
    ["happy", "😊 Happy"], ["funny", "😂 Funny"],
  ];
  const bubbles = [["😊", "happy"], ["🔥", "hyped"], ["😌", "chill"], ["💡", "inspired"], ["❤️", "grateful"], ["🚀", "motivated"]]
    .map(([emoji, key], i) =>
      `<span class="mh-bubble vibe-${key}" style="--x:${8 + i * 16}%;--d:${5 + (i % 3) * 1.4}s;--delay:${-i * 1.1}s">${emoji}</span>`)
    .join("");

  hero.innerHTML = `
    <div class="mh-bubbles">${calm ? "" : bubbles}</div>
    <div class="mh-track"><div class="mh-bee">
      <svg viewBox="8 10 48 46">
        <g class="wing wing-l"><ellipse cx="20.5" cy="24" rx="8.5" ry="6.2" transform="rotate(-28 20.5 24)" fill="#fff" fill-opacity=".92"/></g>
        <g class="wing wing-r"><ellipse cx="43.5" cy="24" rx="8.5" ry="6.2" transform="rotate(28 43.5 24)" fill="#fff" fill-opacity=".92"/></g>
        <path d="M27.5 25.5C26 19.5 23.5 16.5 20.5 15.5M36.5 25.5C38 19.5 40.5 16.5 43.5 15.5" fill="none" stroke="#2B1D3A" stroke-width="2.3" stroke-linecap="round"/>
        <circle cx="20" cy="15.2" r="2.9" fill="#FF8FA3"/><circle cx="44" cy="15.2" r="2.9" fill="#FF8FA3"/>
        <defs><clipPath id="mh-bee-clip"><ellipse cx="32" cy="38" rx="15.5" ry="14.5"/></clipPath></defs>
        <ellipse cx="32" cy="38" rx="15.5" ry="14.5" fill="#FFD659"/>
        <g clip-path="url(#mh-bee-clip)" fill="#2B1D3A"><rect x="12" y="42.2" width="40" height="3.6" rx="1.8"/><rect x="12" y="48" width="40" height="3.2" rx="1.6"/></g>
        <ellipse cx="26.2" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/><ellipse cx="37.8" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/>
        <circle cx="27.4" cy="33.6" r="1.3" fill="#fff"/><circle cx="39" cy="33.6" r="1.3" fill="#fff"/>
        <ellipse cx="21.6" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3"/><ellipse cx="42.4" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3"/>
        <path d="M29.2 39.4q2.8 2.8 5.6 0" fill="none" stroke="#2B1D3A" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    </div></div>
    <p class="mh-ticker">Feeling <span class="mh-vibe-slot"><span class="mh-vibe vibe-hyped">🔥 Hyped</span></span></p>
    <p class="mh-tag">Share the vibe. Join the hive.</p>`;

  if (calm) return;
  const slot = hero.querySelector(".mh-vibe-slot");
  let i = 0;
  setInterval(() => {
    i = (i + 1) % TICKER.length;
    const [key, label] = TICKER[i];
    const old = slot.firstElementChild;
    old.classList.add("out");
    const next = document.createElement("span");
    next.className = `mh-vibe vibe-${key} in`;
    next.textContent = label;
    slot.appendChild(next);
    setTimeout(() => old.remove(), 450);
  }, 2200);
})();

/* ---------------------------------------------------------------- laptops: big panel */
(() => {
  const panel = document.querySelector(".auth-brand");
  const stage = document.querySelector("[data-showcase]");
  if (!panel || !stage || getComputedStyle(panel).display === "none") return;
  // Safety net: if the stylesheet is missing or outdated, show nothing rather than a broken layout
  if (getComputedStyle(stage).position !== "relative") return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const VIBES = [
    { key: "happy", emoji: "😊", label: "Happy" },
    { key: "hyped", emoji: "🔥", label: "Hyped" },
    { key: "inspired", emoji: "💡", label: "Inspired" },
    { key: "chill", emoji: "😌", label: "Chill" },
    { key: "grateful", emoji: "❤️", label: "Grateful" },
    { key: "late_night", emoji: "🌙", label: "Late Night" },
    { key: "motivated", emoji: "🚀", label: "Motivated" },
  ];
  const STORIES = [
    { text: "Just got my first internship!! 🎉", vibe: "hyped" },
    { text: "Rainy evening, chai and a good book ☕", vibe: "chill" },
    { text: "Finished my first 5km run today 🏃", vibe: "motivated" },
    { text: "3am and my app finally works 💻", vibe: "late_night" },
    { text: "Thankful for friends who show up 💛", vibe: "grateful" },
    { text: "Sunsets like this make my whole day 🌅", vibe: "happy" },
  ];

  /* ------------------------------------------------------------------ 3. bubbles */
  if (!reduceMotion) {
    const layer = document.createElement("div");
    layer.className = "vibe-bubbles";
    layer.setAttribute("aria-hidden", "true");
    const emojis = ["😊", "🔥", "💡", "😌", "❤️", "🎯", "😂", "🌙", "🚀"];
    const keys = ["happy", "hyped", "inspired", "chill", "grateful", "focused", "funny", "late_night", "motivated"];
    for (let i = 0; i < 9; i++) {
      const n = i % emojis.length;
      const b = document.createElement("span");
      b.className = `vibe-bubble vibe-${keys[n]}`;
      b.textContent = emojis[n];
      b.style.setProperty("--x", `${4 + Math.random() * 88}%`);
      b.style.setProperty("--s", `${34 + Math.random() * 26}px`);
      b.style.setProperty("--d", `${11 + Math.random() * 9}s`);
      b.style.setProperty("--delay", `${-Math.random() * 18}s`);
      b.style.setProperty("--sway", `${(Math.random() - 0.5) * 120}px`);
      layer.appendChild(b);
    }
    panel.prepend(layer);
  }

  /* ------------------------------------------------------------------ 2. vibe picker demo */
  const chips = VIBES.map((v) => `<span class="sc-chip vibe-${v.key}" data-vibe="${v.key}">${v.emoji} ${v.label}</span>`).join("");
  stage.innerHTML = `
    <div class="sc-card sc-composer">
      <div class="sc-row">
        <span class="sc-avatar">🐝</span>
        <div><div class="sc-name">You</div><div class="sc-sub">What's buzzing in your mind?</div></div>
      </div>
      <p class="sc-text"><span data-typed></span><span class="sc-caret"></span></p>
      <div class="sc-chips">${chips}</div>
      <div class="sc-foot"><span data-hint>Pick a vibe ✨</span><span class="sc-btn" data-post>Post</span></div>
      <span class="sc-finger" aria-hidden="true">👆</span>
    </div>
    <div class="sc-card sc-post" data-published>
      <div class="sc-row">
        <span class="sc-avatar">🐝</span>
        <div><div class="sc-name">You</div><div class="sc-sub">just now</div></div>
        <span class="sc-badge" data-badge></span>
      </div>
      <p class="sc-post-text" data-post-text></p>
      <div class="sc-likes"><span class="sc-heart" data-heart>🤍 <b data-likes>0</b></span><span>💬 <b data-comments>0</b></span></div>
    </div>`;

  const typed = stage.querySelector("[data-typed]");
  const hint = stage.querySelector("[data-hint]");
  const postBtn = stage.querySelector("[data-post]");
  const finger = stage.querySelector(".sc-finger");
  const composer = stage.querySelector(".sc-composer");
  const published = stage.querySelector("[data-published]");
  const heart = stage.querySelector("[data-heart]");
  const likes = stage.querySelector("[data-likes]");
  const comments = stage.querySelector("[data-comments]");

  // Place the published post right under the composer (its height depends on how the chips wrap)
  let scale = 1;
  function layout() {
    const gap = 14;
    published.style.top = `${composer.offsetHeight + gap}px`;
    const height = composer.offsetHeight + gap + published.offsetHeight;
    stage.style.height = `${height}px`;
    fitToScreen(height);
  }

  // Keep the whole panel on one screen: if it's taller than the window,
  // shrink the demo cards just enough (never below 70%) so nothing needs scrolling.
  function fitToScreen(height) {
    stage.style.transform = "";
    stage.style.marginBottom = "";
    scale = 1;
    const overflow = panel.scrollHeight - panel.clientHeight;
    if (overflow <= 0) return;
    scale = Math.max(0.7, (height - overflow - 4) / height);
    stage.style.transformOrigin = "top left";
    stage.style.transform = `scale(${scale})`;
    stage.style.marginBottom = `${-height * (1 - scale)}px`;
  }
  layout();
  addEventListener("resize", layout);

  function pointAt(el) {
    const c = composer.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = (r.left - c.left + r.width / 2) / scale - 10;
    const y = (r.top - c.top + r.height) / scale - 6;
    finger.style.transform = `translate(${x}px, ${y}px)`;
    finger.classList.add("show");
  }

  function fillPost(story) {
    const vibe = VIBES.find((v) => v.key === story.vibe);
    const badge = stage.querySelector("[data-badge]");
    badge.className = `sc-badge vibe-${vibe.key}`;
    badge.textContent = `${vibe.emoji} ${vibe.label}`;
    stage.querySelector("[data-post-text]").textContent = story.text;
    layout();
    heart.firstChild.textContent = "🤍 ";
    likes.textContent = "0";
    comments.textContent = "0";
  }

  if (reduceMotion) {
    // A calm, finished example instead of an animation
    typed.textContent = STORIES[0].text;
    stage.querySelector('[data-vibe="hyped"]').classList.add("picked");
    hint.textContent = "Feeling hyped 🔥";
    postBtn.classList.add("ready");
    fillPost(STORIES[0]);
    likes.textContent = "24";
    published.classList.add("show");
    return;
  }

  /* ------------------------------------------------------------------ 1. flying bee */
  const bee = document.createElement("div");
  bee.className = "fly-bee";
  bee.setAttribute("aria-hidden", "true");
  bee.innerHTML = `
    <svg viewBox="8 10 48 46">
      <g class="wing wing-l"><ellipse cx="20.5" cy="24" rx="8.5" ry="6.2" transform="rotate(-28 20.5 24)" fill="#fff" fill-opacity=".92"/></g>
      <g class="wing wing-r"><ellipse cx="43.5" cy="24" rx="8.5" ry="6.2" transform="rotate(28 43.5 24)" fill="#fff" fill-opacity=".92"/></g>
      <path d="M27.5 25.5C26 19.5 23.5 16.5 20.5 15.5M36.5 25.5C38 19.5 40.5 16.5 43.5 15.5" fill="none" stroke="#2B1D3A" stroke-width="2.3" stroke-linecap="round"/>
      <circle cx="20" cy="15.2" r="2.9" fill="#FF8FA3"/><circle cx="44" cy="15.2" r="2.9" fill="#FF8FA3"/>
      <defs><clipPath id="fly-bee-clip"><ellipse cx="32" cy="38" rx="15.5" ry="14.5"/></clipPath></defs>
      <ellipse cx="32" cy="38" rx="15.5" ry="14.5" fill="#FFD659"/>
      <g clip-path="url(#fly-bee-clip)" fill="#2B1D3A"><rect x="12" y="42.2" width="40" height="3.6" rx="1.8"/><rect x="12" y="48" width="40" height="3.2" rx="1.6"/></g>
      <ellipse cx="26.2" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/><ellipse cx="37.8" cy="35" rx="3.3" ry="3.7" fill="#2B1D3A"/>
      <circle cx="27.4" cy="33.6" r="1.3" fill="#fff"/><circle cx="39" cy="33.6" r="1.3" fill="#fff"/>
      <ellipse cx="21.6" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3"/><ellipse cx="42.4" cy="39.6" rx="2.6" ry="1.6" fill="#FF8FA3"/>
      <path d="M29.2 39.4q2.8 2.8 5.6 0" fill="none" stroke="#2B1D3A" stroke-width="1.9" stroke-linecap="round"/>
    </svg>`;
  panel.appendChild(bee);

  const beeState = { x: 0, y: 0, t: 0, visit: null, lastDot: 0, facing: 1 };

  /** Fly the bee to an element, hover there, run `onArrive`, then fly back to its loop. */
  function beeVisit(el, onArrive) {
    return new Promise((resolve) => {
      beeState.visit = { el, onArrive, resolve, start: performance.now(), fromX: beeState.x, fromY: beeState.y };
    });
  }

  function loopPoint(t) {
    // a lazy figure-eight across the panel
    const w = panel.clientWidth, h = panel.clientHeight;
    return {
      x: w * 0.52 + Math.sin(t) * w * 0.36,
      y: h * 0.42 + Math.sin(2 * t) * h * 0.2 + Math.sin(t * 5) * 6,
    };
  }

  function frame(now) {
    const p = panel.getBoundingClientRect();
    let x, y;
    const v = beeState.visit;
    if (v) {
      const r = v.el.getBoundingClientRect();
      const tx = r.left - p.left + r.width / 2 - 8, ty = r.top - p.top - 26;
      const k = Math.min(1, (now - v.start) / 900);
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      x = v.fromX + (tx - v.fromX) * ease;
      y = v.fromY + (ty - v.fromY) * ease + Math.sin(now / 90) * 2;
      if (k === 1 && !v.arrived) {
        v.arrived = now;
        v.onArrive?.();
      }
      if (v.arrived && now - v.arrived > 650) {
        beeState.visit = null;
        beeState.returning = { start: now, fromX: x, fromY: y };
        v.resolve();
      }
    } else {
      beeState.t += 0.006;
      const target = loopPoint(beeState.t);
      const back = beeState.returning;
      if (back) {
        const k = Math.min(1, (now - back.start) / 1100);
        x = back.fromX + (target.x - back.fromX) * k;
        y = back.fromY + (target.y - back.fromY) * k;
        if (k === 1) beeState.returning = null;
      } else {
        ({ x, y } = target);
      }
    }
    const dx = x - beeState.x;
    if (Math.abs(dx) > 0.3) beeState.facing = dx > 0 ? 1 : -1;
    const tilt = Math.max(-18, Math.min(18, dx * 4));
    bee.style.transform = `translate(${x}px, ${y}px) scaleX(${beeState.facing}) rotate(${tilt * beeState.facing}deg)`;
    beeState.x = x;
    beeState.y = y;

    // dotted trail
    if (now - beeState.lastDot > 110 && !v?.arrived) {
      beeState.lastDot = now;
      const dot = document.createElement("span");
      dot.className = "bee-dot";
      dot.style.transform = `translate(${x + 22 - beeState.facing * 18}px, ${y + 30}px)`;
      panel.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    }
    requestAnimationFrame(frame);
  }
  const start = loopPoint(0);
  beeState.x = start.x; beeState.y = start.y;
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------------ the story loop */
  async function tellStory(story) {
    // reset
    typed.textContent = "";
    hint.textContent = "Pick a vibe ✨";
    postBtn.classList.remove("ready", "press");
    stage.querySelectorAll(".sc-chip").forEach((c) => c.classList.remove("picked", "hover"));
    composer.classList.remove("sent");
    finger.classList.remove("show");

    // type the text
    for (const ch of story.text) {
      typed.textContent += ch;
      await wait(ch === " " ? 70 : 45);
    }
    postBtn.classList.add("ready");
    await wait(400);

    // the finger "tries" two vibes, then picks the right one
    const all = [...stage.querySelectorAll(".sc-chip")];
    const target = stage.querySelector(`.sc-chip[data-vibe="${story.vibe}"]`);
    const others = all.filter((c) => c !== target).sort(() => Math.random() - 0.5).slice(0, 2);
    for (const chip of others) {
      pointAt(chip); chip.classList.add("hover");
      await wait(520);
      chip.classList.remove("hover");
    }
    pointAt(target);
    await wait(450);
    target.classList.add("picked");
    const vibe = VIBES.find((v) => v.key === story.vibe);
    hint.textContent = `Feeling ${vibe.label.toLowerCase()} ${vibe.emoji}`;
    await wait(700);

    // press Post
    pointAt(postBtn);
    await wait(500);
    postBtn.classList.add("press");
    await wait(180);
    finger.classList.remove("show");
    composer.classList.add("sent");

    // the post appears
    fillPost(story);
    published.classList.remove("leave");
    published.classList.add("show");
    await wait(700);

    // the bee flies over and likes it
    await beeVisit(heart, () => {
      heart.firstChild.textContent = "❤️ ";
      heart.classList.remove("pop"); void heart.offsetWidth; heart.classList.add("pop");
      likes.textContent = "1";
    });
    // more likes and a comment roll in
    const total = 12 + Math.floor(Math.random() * 40);
    for (let n = 2; n <= total; n += Math.ceil(total / 12)) {
      likes.textContent = String(n);
      await wait(90);
    }
    likes.textContent = String(total);
    comments.textContent = String(1 + Math.floor(Math.random() * 6));
    await wait(2200);

    published.classList.add("leave");
    published.classList.remove("show");
    await wait(600);
  }

  (async () => {
    let i = 0;
    await wait(600);
    for (;;) {
      await tellStory(STORIES[i % STORIES.length]);
      i++;
    }
  })();
})();
