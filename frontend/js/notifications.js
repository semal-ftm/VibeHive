/* ==========================================================================
   notifications.js — recent likes, comments and follows on your content
   ========================================================================== */

(() => {
  if (!VH.initPage({ active: "notifications" })) return;

  const container = VH.qs("#notifications");
  let items = [];
  let filter = "all";
  let seenBefore = 0;
  try { seenBefore = Number(localStorage.getItem(VH.notifKey("seen")) || 0); } catch { /* ignore */ }

  const ICON_FOR = { like: "heart", comment: "message", follow: "userPlus" };

  function describe(item) {
    const who = `<strong>${VH.esc(VH.displayName(item.actor))}</strong>`;
    if (item.type === "like") return `${who} liked your post`;
    if (item.type === "comment") return `${who} commented on your post`;
    return item.actor.is_following ? `${who} followed you back — you can see each other's vibes 🐝` : `${who} followed you · follow back to see each other's vibes`;
  }

  function renderItem(item) {
    const unread = new Date(item.created_at).getTime() > seenBefore;
    const link = item.post ? `post.html?id=${item.post.id}` : VH.profileUrl(item.actor);
    const quote =
      item.type === "comment" ? item.comment :
      item.type === "like" ? item.post.excerpt : "";
    return `
      <div class="notif ${unread ? "unread" : ""}">
        <a class="notif-avatar" href="${VH.profileUrl(item.actor)}">
          ${VH.avatar(item.actor, 44)}
          <span class="notif-icon ${item.type}">${VH.icon(ICON_FOR[item.type])}</span>
        </a>
        <div class="notif-main">
          <div class="notif-top">
            <a class="notif-text" href="${link}">
              ${describe(item)} <span class="notif-time">· ${VH.timeAgo(item.created_at)}</span>
            </a>
            ${item.type === "follow" ? VH.followButton(item.actor) : ""}
          </div>
          ${quote ? `<a class="notif-quote" href="${link}">${VH.esc(quote)}</a>` : ""}
        </div>
      </div>`;
  }

  function render() {
    const visible = filter === "all" ? items : items.filter((i) => i.type === filter);
    container.innerHTML = visible.length
      ? visible.map(renderItem).join("")
      : VH.emptyState({
          emoji: "🔔",
          title: filter === "all" ? "No buzz yet" : "Nothing here yet",
          text: "When people like, comment on your posts or join your hive, you'll see it here.",
          action: `<button class="btn btn-primary" type="button" data-action="compose">${VH.icon("plus")} Share a vibe</button>`,
        });
  }

  VH.qsa("[data-filter]").forEach((tab) =>
    tab.addEventListener("click", () => {
      filter = tab.dataset.filter;
      VH.qsa("[data-filter]").forEach((t) => t.classList.toggle("active", t === tab));
      render();
    })
  );

  async function load() {
    container.innerHTML = VH.skeletonRows(5).replace(/user-row/g, "user-row notif");
    try {
      items = await API.get("/notifications/");
      render();
      VH.markNotificationsSeen(items); // clears the bell badge
    } catch (err) {
      container.innerHTML = VH.emptyState({
        emoji: "😵",
        title: "Couldn't load notifications",
        text: VH.esc(err.message),
        action: '<button class="btn btn-outline" type="button" data-retry>Try again</button>',
      });
      VH.qs("[data-retry]", container).addEventListener("click", load);
    }
  }

  // New activity arrives live while this page is open
  document.addEventListener("vh:notifications", (e) => {
    const newest = e.detail[0]?.created_at;
    if (newest && newest !== items[0]?.created_at) {
      items = e.detail;
      render();
      VH.markNotificationsSeen(items);
    }
  });

  load();
})();
