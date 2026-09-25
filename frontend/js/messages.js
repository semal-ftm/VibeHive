/* ==========================================================================
   messages.js — your chats, newest first, updated live every few seconds.
   "New chat" lists everyone you can message (mutual followers).
   ========================================================================== */

(() => {
  if (!VH.initPage({ active: "messages", rightbar: ["search", "suggested", "info"] })) return;

  const list = VH.qs("#chat-list");
  const filter = VH.qs("#chat-filter");
  let chats = [];
  let signature = "";

  function row(chat) {
    const last = chat.last_message;
    const who = VH.displayName(chat.other);
    const preview = chat.other_typing
      ? '<span class="typing-text">typing…</span>'
      : `${last.is_mine ? '<span class="you">You: </span>' : ""}${last.vibe ? `${last.vibe.emoji} ` : ""}${VH.esc(last.preview)}`;
    return `
      <a class="chat-row ${chat.unread ? "unread" : ""}" href="chat.html?c=${chat.id}" data-name="${VH.esc((who + " " + chat.other.username).toLowerCase())}">
        ${VH.avatar(chat.other, 50)}
        <span class="chat-row-main">
          <span class="chat-row-top">
            <span class="name">${VH.esc(who)}</span>
            <time class="time" datetime="${last.created_at}">${VH.timeAgo(last.created_at)}</time>
          </span>
          <span class="chat-row-bottom">
            <span class="preview">${preview}</span>
            ${chat.unread ? `<span class="unread-badge">${chat.unread > 9 ? "9+" : chat.unread}</span>` : ""}
          </span>
        </span>
      </a>`;
  }

  function render() {
    const q = filter.value.trim().toLowerCase();
    const visible = q ? chats.filter((c) => (VH.displayName(c.other) + " " + c.other.username).toLowerCase().includes(q)) : chats;
    if (!chats.length) {
      list.innerHTML = VH.emptyState({
        emoji: "💬",
        title: "No chats yet",
        text: "Start a private chat with someone you follow each other with.",
        action: `<button class="btn btn-primary" type="button" data-new-chat>${VH.icon("chats")} Start a chat</button>`,
      });
      return;
    }
    list.innerHTML = visible.length ? visible.map(row).join("")
      : `<p class="empty-mini">No chats match “${VH.esc(filter.value)}”.</p>`;
  }

  async function load(showSkeleton = false) {
    if (showSkeleton) list.innerHTML = VH.skeletonRows(4);
    try {
      const data = await API.get("/chats/");
      const next = JSON.stringify(data);
      if (next === signature) return; // nothing changed – don't redraw
      signature = next;
      chats = data;
      render();
    } catch (err) {
      if (showSkeleton) list.innerHTML = VH.emptyState({ emoji: "😵", title: "Couldn't load your chats", text: VH.esc(err.message) });
    }
  }

  filter.addEventListener("input", render);

  /* New chat: pick one of your mutual followers */
  async function openNewChat() {
    const body = VH.html(`
      <div class="new-chat">
        <div class="search">
          ${VH.icon("search")}
          <input class="input" type="search" placeholder="Search people you follow each other with…" aria-label="Search contacts">
        </div>
        <div class="new-chat-list">${VH.skeletonRows(3)}</div>
      </div>`);
    const modal = VH.openModal({ title: "New chat 💬", body, size: "modal-sm" });
    const out = VH.qs(".new-chat-list", body);
    let people = [];
    try {
      people = await API.get("/chats/contacts/");
    } catch (err) {
      out.innerHTML = `<p class="empty-mini">${VH.esc(err.message)}</p>`;
      return;
    }
    const draw = (q = "") => {
      const shown = people.filter((u) => (VH.displayName(u) + " " + u.username).toLowerCase().includes(q.toLowerCase()));
      out.innerHTML = !people.length
        ? `<div class="empty-mini"><strong>No one to message yet 🐝</strong>You can chat with people once you follow each other.</div>`
        : shown.length
          ? shown.map((u) => `
              <button class="account-item" type="button" data-start="${u.id}">
                ${VH.avatar(u, 40)}
                <span class="meta"><span class="name">${VH.esc(VH.displayName(u))}</span><span class="handle">@${VH.esc(u.username)}</span></span>
                ${VH.icon("chats", "icon-sm")}
              </button>`).join("")
          : `<p class="empty-mini">No one found.</p>`;
    };
    draw();
    VH.qs("input", body).addEventListener("input", (e) => draw(e.target.value));
    out.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-start]");
      if (pick) VH.startChat(Number(pick.dataset.start), pick);
    });
    return modal;
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-new-chat]")) openNewChat();
  });

  // Live updates: refresh when the shell sees new messages, and every 5 s while open
  document.addEventListener("vh:chats", () => load());
  setInterval(() => { if (document.visibilityState === "visible") load(); }, 5000);
  load(true);
})();
