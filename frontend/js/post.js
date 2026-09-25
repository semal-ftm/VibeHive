/* ==========================================================================
   post.js — single post page (post.html?id=<id>) with comments open
   ========================================================================== */

(() => {
  if (!VH.initPage({ active: "" })) return;

  const slot = VH.qs("#post-slot");
  const id = Number(new URLSearchParams(location.search).get("id"));

  VH.qs("#back-link").addEventListener("click", (e) => {
    if (history.length > 1 && document.referrer.startsWith(location.origin)) {
      e.preventDefault();
      history.back();
    }
  });

  const gone = () =>
    `<div class="card">${VH.emptyState({
      emoji: "🍃",
      title: "This vibe has flown away",
      text: "It may have been deleted — or it's only visible to people who follow each other with its author.",
      action: `<a class="btn btn-primary" href="index.html">${VH.icon("home")} Back to your hive</a>`,
    })}</div>`;

  async function load() {
    if (!id) { slot.innerHTML = gone(); return; }
    slot.innerHTML = VH.postSkeleton();
    try {
      const post = await API.get(`/posts/${id}/`);
      document.title = `${VH.displayName(post.author)} on VibeHive`;
      const card = VH.renderPost(post);
      slot.replaceChildren(card);
      VH.openComments(card, false);
    } catch (err) {
      slot.innerHTML = err.status === 404 ? gone() : `<div class="card">${VH.emptyState({ emoji: "😵", title: "Couldn't load this post", text: VH.esc(err.message) })}</div>`;
    }
  }

  document.addEventListener("vh:post-deleted", (e) => {
    if (e.detail.id === id) setTimeout(() => { location.href = "index.html"; }, 600);
  });

  load();
})();
