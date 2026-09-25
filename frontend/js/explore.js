/* ==========================================================================
   explore.js — Explore the Hive: search, vibe filters, trending topics,
   suggested creators, newest members and popular posts.
   Supports ?q=<search>, ?vibe=<key> and ?tag=<hashtag> in the URL.
   ========================================================================== */

(() => {
  if (!VH.initPage({ active: "explore", rightbar: ["vibes", "info"] })) return;

  const params = new URLSearchParams(location.search);
  const state = { vibe: params.get("vibe") || "", tag: (params.get("tag") || "").replace(/^#/, "") };

  const searchInput = VH.qs("#explore-search");
  const searchSection = VH.qs("#search-section");
  const searchResults = VH.qs("#search-results");
  const discover = VH.qs("#discover");

  /* ---------- search ---------- */
  let lastQuery = "";
  const runSearch = VH.debounce(async () => {
    const query = searchInput.value.trim();
    lastQuery = query;
    const url = new URL(location.href);
    query ? url.searchParams.set("q", query) : url.searchParams.delete("q");
    history.replaceState(null, "", url);

    if (!query) {
      searchSection.classList.add("hidden");
      discover.classList.remove("hidden");
      return;
    }
    searchSection.classList.remove("hidden");
    discover.classList.add("hidden");
    searchResults.innerHTML = VH.skeletonRows(3);
    try {
      const users = await VH.searchUsers(query);
      if (query !== lastQuery) return;
      searchResults.innerHTML = users.length
        ? users.map((u) => VH.userRow(u, { bio: true })).join("")
        : VH.emptyState({ emoji: "🔍", title: "No one found in the hive.", text: "Try another search." });
    } catch (err) {
      searchResults.innerHTML = VH.emptyState({ emoji: "😵", title: "Search failed", text: VH.esc(err.message) });
    }
  }, 250);

  searchInput.addEventListener("input", runSearch);
  VH.qs("#explore-search-form").addEventListener("submit", (e) => { e.preventDefault(); runSearch(); });
  if (params.get("q")) {
    searchInput.value = params.get("q");
    runSearch();
  }

  /* ---------- vibe chips ---------- */
  const chips = VH.qs("#vibe-chips");
  function renderChips() {
    chips.innerHTML =
      `<button class="pill ${!state.vibe ? "active" : ""}" type="button" data-vibe="">🌈 All vibes</button>` +
      VH.VIBES.map((v) => `<button class="pill ${state.vibe === v.key ? "active" : ""}" type="button" data-vibe="${v.key}">${v.emoji} ${v.label}</button>`).join("");
  }
  chips.addEventListener("click", (e) => {
    const pill = e.target.closest("[data-vibe]");
    if (!pill) return;
    state.vibe = pill.dataset.vibe;
    state.tag = "";
    applyFilters(true);
  });

  /* ---------- posts (popular or filtered) ---------- */
  const feed = new VH.PostFeed(VH.qs("#explore-feed"));
  const banner = VH.qs("#filter-banner");
  const title = VH.qs("#posts-title");

  function applyFilters(scroll = false) {
    renderChips();
    const url = new URL(location.href);
    ["vibe", "tag"].forEach((k) => (state[k] ? url.searchParams.set(k, state[k]) : url.searchParams.delete(k)));
    history.replaceState(null, "", url);

    const vibe = VH.VIBES.find((v) => v.key === state.vibe);
    if (state.tag) {
      title.textContent = `#${state.tag}`;
      feed.empty = VH.emptyState({ emoji: "#️⃣", title: `Nothing tagged #${VH.esc(state.tag)} in your hive yet`, text: "Use it in a post to start the trend." });
      feed.load(`tag=${encodeURIComponent(state.tag)}`);
    } else if (vibe) {
      title.textContent = `${vibe.emoji} ${vibe.label} vibes`;
      feed.empty = VH.emptyState({ emoji: vibe.emoji, title: `No ${vibe.label.toLowerCase()} vibes in your hive yet`, text: "Be the first to share one." });
      feed.load(`vibe=${vibe.key}`);
    } else {
      title.textContent = "🔥 Popular in your hive";
      feed.empty = VH.emptyState({ emoji: "🐝", title: "Nothing popular yet", text: "Popular posts from people you follow each other with will show up here." });
      feed.load("sort=popular");
    }

    banner.innerHTML = state.tag || vibe
      ? `<div class="card filter-banner"><span>Showing ${state.tag ? `posts tagged <strong>#${VH.esc(state.tag)}</strong>` : `<strong>${vibe.emoji} ${vibe.label}</strong> posts`}</span>
           <button class="btn btn-ghost btn-sm" type="button" data-clear>${VH.icon("x", "icon-sm")} Clear</button></div>`
      : "";
    VH.qs("[data-clear]", banner)?.addEventListener("click", () => {
      state.vibe = "";
      state.tag = "";
      applyFilters();
    });
    if (scroll) title.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- trending topics ---------- */
  async function loadTopics() {
    const grid = VH.qs("#topics");
    grid.innerHTML = Array.from({ length: 4 }, () => '<div class="card topic-card"><div class="skeleton sk-line" style="margin:0"></div><div class="skeleton sk-line" style="width:50%"></div></div>').join("");
    try {
      const { topics } = await VH.getTrending();
      grid.innerHTML = topics.length
        ? topics.map((t) => `
            <button class="card topic-card" type="button" data-tag="${VH.esc(t.tag)}">
              <div class="tag">#${VH.esc(t.tag)}</div>
              <div class="count">${t.count} ${t.count === 1 ? "post" : "posts"}</div>
            </button>`).join("")
        : `<p class="text-muted">No trending topics yet. Add #hashtags to your posts!</p>`;
    } catch {
      grid.innerHTML = `<p class="text-muted">Couldn't load topics.</p>`;
    }
  }
  VH.qs("#topics").addEventListener("click", (e) => {
    const card = e.target.closest("[data-tag]");
    if (!card) return;
    state.tag = card.dataset.tag;
    state.vibe = "";
    applyFilters(true);
  });

  /* ---------- people ---------- */
  async function loadCreators() {
    const grid = VH.qs("#creators");
    grid.innerHTML = Array.from({ length: 3 }, () => '<div class="card user-card" style="height:250px"><div class="cover"></div></div>').join("");
    try {
      const data = await API.get("/users/?suggested=1");
      grid.innerHTML = data.results.length
        ? data.results.slice(0, 6).map(VH.userCard).join("")
        : `<div class="card" style="grid-column:1/-1">${VH.emptyState({ emoji: "🎉", title: "You're following everyone!", text: "Your hive is complete — for now." })}</div>`;
    } catch {
      grid.innerHTML = `<p class="text-muted">Couldn't load creators.</p>`;
    }
  }

  async function loadNewMembers() {
    const list = VH.qs("#new-members");
    list.innerHTML = VH.skeletonRows(3);
    try {
      const data = await API.get("/users/");
      const people = data.results.filter((u) => !u.is_me).slice(0, 5);
      list.innerHTML = people.length
        ? people.map((u) => VH.userRow(u, { bio: true })).join("")
        : VH.emptyState({ emoji: "🌱", title: "Your hive is just getting started.", text: "Invite a friend to join VibeHive." });
    } catch {
      list.innerHTML = `<p class="empty-state text-muted">Couldn't load members.</p>`;
    }
  }

  async function loadVibeMatches() {
    const grid = VH.qs("#match-grid");
    grid.innerHTML = Array.from({ length: 3 }, () => '<div class="card user-card" style="height:260px"><div class="cover"></div></div>').join("");
    try {
      const data = await VH.loadMatches(6);
      if (!data.ready) {
        grid.innerHTML = `<div class="card" style="grid-column:1/-1">${VH.matchesLockedHTML(data)}</div>`;
      } else if (!data.results.length) {
        grid.innerHTML = `<div class="card" style="grid-column:1/-1">${VH.emptyState({ emoji: "🐝", title: "No matches yet", text: "As more people share vibes, your matches will appear here." })}</div>`;
      } else {
        grid.innerHTML = data.results.map(VH.matchCard).join("");
      }
    } catch {
      grid.innerHTML = `<p class="text-muted">Couldn't load your vibe matches.</p>`;
    }
  }

  applyFilters();
  loadVibeMatches();
  loadTopics();
  loadCreators();
  loadNewMembers();
})();
