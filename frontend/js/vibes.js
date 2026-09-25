/* ==========================================================================
   vibes.js — VibeHive's signature features
   • Vibe Match   : how compatible two members' moods are (score ring,
                    "vibe DNA" bars, match cards and the sidebar widget)
   • Vibe Calendar: a year-in-pixels style grid where every day is coloured
                    by the vibe you posted most that day
   Loaded after app.js on every app page.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Small building blocks
   -------------------------------------------------------------------------- */
VH.matchRing = (score, size = 96) => `
  <div class="match-ring" style="--p:${score ?? 0};--ring-size:${size}px" role="img"
       aria-label="${score == null ? "Vibe match not available yet" : `${score}% vibe match`}">
    <span class="match-ring-value">${score == null ? "?" : `${score}<small>%</small>`}</span>
  </div>`;

VH.matchPill = (score) => `<span class="match-pill" title="${score}% vibe match">${VH.icon("sparkles", "icon-sm")}${score}%</span>`;

/** Segmented bar showing a member's vibe mix, e.g. 40% 😊 · 30% 😌 · … */
VH.vibeDNA = (vibes) => {
  if (!vibes || !vibes.length) return `<div class="dna dna-empty"></div>`;
  return `<div class="dna">${vibes.map((v) =>
    `<span class="vibe-${v.key}" style="flex:${Math.max(v.share, 2)}" title="${v.emoji} ${VH.esc(v.label)} · ${v.share}%"></span>`).join("")}</div>`;
};

VH.sharedText = (shared) => {
  if (!shared.length) return "";
  const names = shared.map((v) => `${v.emoji} ${VH.esc(v.label)}`);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} &amp; ${names[names.length - 1]}` : names[0];
  return list;
};

/* --------------------------------------------------------------------------
   Vibe Match — profile card
   -------------------------------------------------------------------------- */
VH.renderVibeMatch = async (container, user) => {
  container.innerHTML = `<section class="card vibe-card"><div class="skeleton" style="height:120px;border-radius:14px"></div></section>`;
  try {
    if (user.is_me) return renderMyMatches(container, user);
    const data = await API.get(`/users/${user.id}/vibe-match/`);
    const them = VH.firstName(user);

    let body;
    if (data.score == null) {
      const iNeedMore = data.me.total < data.needed;
      body = `
        <div class="vibe-match">
          ${VH.matchRing(null)}
          <div class="vibe-match-text">
            <span class="eyebrow">Vibe Match</span>
            <h3>Not enough vibes yet 🌱</h3>
            <p>${iNeedMore
              ? `Share at least ${data.needed} posts with a vibe to see how you match with ${VH.esc(them)}.`
              : `${VH.esc(them)} needs to share a few more vibes before we can compare.`}</p>
            ${iNeedMore ? `<button class="btn btn-primary btn-sm" type="button" data-action="compose">${VH.icon("plus", "icon-sm")} Share a vibe</button>` : ""}
          </div>
        </div>`;
    } else {
      body = `
        <div class="vibe-match">
          ${VH.matchRing(data.score)}
          <div class="vibe-match-text">
            <span class="eyebrow">Vibe Match</span>
            <h3>${VH.esc(data.label)} ${data.emoji}</h3>
            <p>${data.shared.length
              ? `You and ${VH.esc(them)} both share ${VH.sharedText(data.shared)} vibes.`
              : `You and ${VH.esc(them)} bring totally different energy to the hive.`}</p>
          </div>
        </div>
        <div class="dna-compare">
          <div class="dna-row">${VH.avatar(VH.me, 28)}<span class="dna-name">You</span>${VH.vibeDNA(data.me.vibes)}</div>
          <div class="dna-row">${VH.avatar(user, 28)}<span class="dna-name">${VH.esc(them)}</span>${data.them.hidden
            ? `<span class="dna-locked">🔒 Their vibe DNA unlocks when you follow each other</span>`
            : VH.vibeDNA(data.them.vibes)}</div>
        </div>`;
    }
    container.innerHTML = `<section class="card vibe-card">${body}</section>`;
  } catch (err) {
    container.innerHTML = "";
  }
};

/** On your own profile: your vibe DNA + the members you match best. */
async function renderMyMatches(container, user) {
  const [matches, self] = await Promise.all([
    API.get("/vibe-matches/?limit=3"),
    API.get(`/users/${user.id}/vibe-match/`),
  ]);
  const dna = self.me;
  container.innerHTML = `
    <section class="card vibe-card">
      <div class="vibe-card-head">
        <div>
          <span class="eyebrow">Your Vibe DNA</span>
          <h3>${dna.vibes.length ? `Mostly ${dna.vibes[0].emoji} ${VH.esc(dna.vibes[0].label)}` : "Your vibe is still forming 🌱"}</h3>
        </div>
        <a class="btn btn-ghost btn-sm" href="explore.html#matches">See all matches</a>
      </div>
      ${VH.vibeDNA(dna.vibes)}
      <div class="dna-legend">${dna.vibes.slice(0, 5).map((v) =>
        `<span class="vibe-${v.key}"><i></i>${v.emoji} ${VH.esc(v.label)} ${v.share}%</span>`).join("")}</div>
      ${matches.ready && matches.results.length ? `
        <div class="mini-matches">
          ${matches.results.map((m) => `
            <a class="mini-match" href="${VH.profileUrl(m.user)}">
              ${VH.avatar(m.user, 36)}
              <span class="meta"><span class="name">${VH.esc(VH.displayName(m.user))}</span>
              <span class="handle">${m.shared.map((v) => v.emoji).join(" ")} ${VH.esc(m.label)}</span></span>
              ${VH.matchPill(m.score)}
            </a>`).join("")}
        </div>` : `<p class="text-muted vibe-hint">Share ${matches.needed}+ posts with a vibe to unlock your Vibe Matches.</p>`}
    </section>`;
}

/* --------------------------------------------------------------------------
   Vibe Match — explore cards and sidebar widget
   -------------------------------------------------------------------------- */
VH.matchCard = (match) => `
  <div class="card user-card match-card">
    <div class="cover"></div>
    <a href="${VH.profileUrl(match.user)}" class="match-avatar">${VH.avatar(match.user, 64)}${VH.matchRing(match.score, 38)}</a>
    <a class="name" href="${VH.profileUrl(match.user)}">${VH.esc(VH.displayName(match.user))}</a>
    <span class="handle">@${VH.esc(match.user.username)}</span>
    <span class="match-label">${VH.esc(match.label)} ${match.emoji}</span>
    <div class="match-shared">${match.shared.map((v) => `<span class="vibe-badge vibe-${v.key}">${v.emoji} ${VH.esc(v.label)}</span>`).join("")}</div>
    ${VH.followButton(match.user)}
  </div>`;

VH.loadMatches = (limit) => API.get(`/vibe-matches/?limit=${limit}`);

VH.matchesLockedHTML = (data) => VH.emptyState({
  emoji: "🧬",
  title: "Unlock your Vibe Match",
  text: `Share ${data.needed - data.have} more ${data.needed - data.have === 1 ? "post" : "posts"} with a vibe and we'll find the people who feel like you.`,
  action: `<button class="btn btn-primary" type="button" data-action="compose">${VH.icon("plus")} Share a vibe</button>`,
});

/** Right-sidebar widget (called by the shell in app.js). */
VH.loadMatchesWidget = async (el) => {
  try {
    const data = await VH.loadMatches(3);
    if (!data.ready) {
      el.innerHTML = `<p class="text-muted">Share ${data.needed - data.have} more vibe ${data.needed - data.have === 1 ? "post" : "posts"} to unlock your matches 🧬</p>`;
      return;
    }
    el.innerHTML = data.results.length
      ? data.results.map((m) => `
          <a class="user-row" href="${VH.profileUrl(m.user)}">
            ${VH.avatar(m.user, 44)}
            <span class="meta">
              <span class="name">${VH.esc(VH.displayName(m.user))}</span>
              <span class="handle">${m.shared.map((v) => v.emoji).join(" ")} ${VH.esc(m.label)}</span>
            </span>
            ${VH.matchPill(m.score)}
          </a>`).join("")
      : `<p class="text-muted">No matches yet — the hive is still warming up 🐝</p>`;
  } catch {
    el.innerHTML = `<p class="text-muted">Couldn't load your matches.</p>`;
  }
};

/* --------------------------------------------------------------------------
   Vibe Calendar
   -------------------------------------------------------------------------- */
const DAY_MS = 86400000;
const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

VH.renderVibeCalendar = async (container, user) => {
  container.innerHTML = `<section class="card vibe-card"><div class="skeleton" style="height:190px;border-radius:14px"></div></section>`;
  let data;
  try {
    data = await API.get(`/users/${user.id}/vibe-calendar/?weeks=26&tz=${new Date().getTimezoneOffset()}`);
  } catch {
    container.innerHTML = "";
    return;
  }
  if (data.locked) {
    container.innerHTML = `
      <section class="card vibe-card vibe-calendar">
        <div class="vibe-card-head">
          <div>
            <span class="eyebrow">Vibe Calendar</span>
            <h3>🔒 ${VH.esc(VH.firstName(user))}'s calendar is private</h3>
          </div>
        </div>
        <p class="text-muted">You'll see their 6 months of vibes once you follow each other.</p>
      </section>`;
    return;
  }
  const s = data.summary;
  const byDate = Object.fromEntries(data.days.map((d) => [d.date, d]));
  const start = parseDay(data.start);
  const end = parseDay(data.end);
  const weeks = Math.ceil(((end - start) / DAY_MS + 1) / 7);

  // Build columns (weeks) × rows (Sun…Sat) and the month labels above them
  let cells = "";
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start.getTime() + w * 7 * DAY_MS);
    if (weekStart.getMonth() !== lastMonth) {
      // Drop a label that would sit too close to the next one (e.g. "MarApr")
      if (monthLabels.length && w - monthLabels[monthLabels.length - 1].col < 3) monthLabels.pop();
      monthLabels.push({ col: w + 1, text: weekStart.toLocaleDateString(undefined, { month: "short" }) });
      lastMonth = weekStart.getMonth();
    }
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
      const key = dayKey(date);
      if (date > end) { cells += `<span class="cal-cell future"></span>`; continue; }
      const info = byDate[key];
      const level = !info ? 0 : info.count >= 3 ? 3 : info.count;
      const vibeClass = info?.vibe ? `vibe-${info.vibe}` : info ? "no-vibe" : "";
      cells += `<span class="cal-cell ${vibeClass}" data-level="${level}" data-date="${key}" tabindex="${info ? 0 : -1}"></span>`;
    }
  }

  const months = monthLabels.map((m) => `<span style="grid-column:${m.col}">${m.text}</span>`).join("");
  const stat = (label, value) => `<div class="cal-stat"><span>${label}</span><strong>${value}</strong></div>`;
  const vibeValue = (v) => (v ? `${v.emoji} ${VH.esc(v.label)}` : "—");
  const owner = user.is_me ? "Your" : `${VH.esc(VH.firstName(user))}'s`;

  container.innerHTML = `
    <section class="card vibe-card vibe-calendar">
      <div class="vibe-card-head">
        <div>
          <span class="eyebrow">Vibe Calendar</span>
          <h3>${owner} last 6 months in vibes</h3>
        </div>
        <span class="cal-range">${start.toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
      </div>

      <div class="cal-stats">
        ${stat("Top vibe", vibeValue(s.top_vibe))}
        ${stat("This month", vibeValue(s.month_vibe))}
        ${stat("Active days", s.active_days)}
        ${stat("Best streak", `${s.longest_streak} ${s.longest_streak === 1 ? "day" : "days"}`)}
      </div>

      ${s.total_posts ? `
        <div class="cal-scroll">
          <div class="cal-wrap" style="--weeks:${weeks}">
            <div class="cal-months">${months}</div>
            <div class="cal-days"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
            <div class="cal-grid">${cells}</div>
          </div>
        </div>
        <div class="cal-foot">
          <div class="dna-legend">${s.vibe_totals.slice(0, 6).map((v) =>
            `<span class="vibe-${v.key}"><i></i>${v.emoji} ${VH.esc(v.label)}</span>`).join("")}</div>
          <div class="cal-scale">Less <i data-level="1"></i><i data-level="2"></i><i data-level="3"></i> More</div>
        </div>
        <div class="cal-tip" role="tooltip"></div>`
      : VH.emptyState({
          emoji: "🗓️",
          title: user.is_me ? "Your calendar is waiting for colour" : "No vibes in the last 6 months",
          text: user.is_me ? "Every post you share paints a day with its vibe." : "",
        })}
    </section>`;

  if (!s.total_posts) return;

  // Start scrolled to the most recent weeks on small screens
  const scroller = VH.qs(".cal-scroll", container);
  scroller.scrollLeft = scroller.scrollWidth;

  // Tooltip
  const tip = VH.qs(".cal-tip", container);
  const card = VH.qs(".vibe-calendar", container);
  const show = (cell) => {
    const info = byDate[cell.dataset.date];
    if (!info) return;
    const date = parseDay(info.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const mix = Object.entries(info.vibes)
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => {
        const v = VH.VIBES.find((x) => x.key === key);
        return v ? `${v.emoji} ${v.label}${n > 1 ? ` ×${n}` : ""}` : "";
      }).join(" · ");
    tip.innerHTML = `<strong>${date}</strong><span>${info.count} ${info.count === 1 ? "post" : "posts"}${mix ? ` · ${mix}` : ""}</span>`;
    const c = cell.getBoundingClientRect();
    const k = card.getBoundingClientRect();
    tip.classList.add("show");
    const left = Math.min(Math.max(c.left - k.left + c.width / 2 - tip.offsetWidth / 2, 8), k.width - tip.offsetWidth - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${c.top - k.top - tip.offsetHeight - 8}px`;
  };
  const hide = () => tip.classList.remove("show");
  VH.qsa(".cal-cell[tabindex='0']", container).forEach((cell) => {
    cell.addEventListener("mouseenter", () => show(cell));
    cell.addEventListener("focus", () => show(cell));
    cell.addEventListener("mouseleave", hide);
    cell.addEventListener("blur", hide);
  });
};
