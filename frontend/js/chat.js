/* ==========================================================================
   chat.js — one private chat (chat.html?c=<conversation id>)
   • speech bubbles, day separators, photos, vibe badges, "Seen ✓✓"
   • reactions: double-tap = ❤️, long-press / right-click = pick an emoji
   • delete your own messages, "typing…" indicator, load earlier messages
   • updates every 2.5 seconds while open (no WebSockets on the free plan)
   ========================================================================== */

(() => {
  if (!VH.initPage({ active: "messages", rightbar: ["info"] })) return;

  const id = Number(new URLSearchParams(location.search).get("c"));
  VH.activeChat = id; // no pop-ups for this chat while it's open

  const scroller = VH.qs("#chat-scroll");
  const listEl = VH.qs("#chat-messages");
  const olderEl = VH.qs("#chat-older");
  const typingEl = VH.qs("#typing-bubble");
  const personEl = VH.qs("#chat-person");
  const composerSlot = VH.qs("#chat-composer-slot");
  const REACTIONS = ["❤️", "😂", "🔥", "😮", "😢", "👍"];
  const POLL_MS = 2500;

  let conv = null;
  let messages = [];      // oldest → newest
  let hasMore = false;
  let signature = "";
  let composerMode = "";  // "open" | "locked"

  /* ------------------------------------------------------------ helpers */
  const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  }
  const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 90;
  const toBottom = () => { scroller.scrollTop = scroller.scrollHeight; };

  /* ------------------------------------------------------------ header */
  function renderHeader() {
    const o = conv.other;
    personEl.href = VH.profileUrl(o);
    personEl.innerHTML = `
      ${VH.avatar(o, 42)}
      <span class="meta">
        <span class="name">${VH.esc(VH.displayName(o))}</span>
        <span class="status">${conv.other_typing ? '<span class="typing-text">typing…</span>' : `@${VH.esc(o.username)}`}</span>
      </span>`;
    document.title = `${VH.displayName(o)} · VibeHive`;
  }

  /* ------------------------------------------------------------ messages */
  function reactionsHTML(m) {
    if (!m.reactions.length) return "";
    return `<div class="msg-reactions">${m.reactions.map((r) =>
      `<button type="button" class="reaction-chip ${r.mine ? "mine" : ""}" data-react="${r.emoji}" title="${r.mine ? "Tap to remove" : "React"}">${r.emoji}${r.count > 1 ? ` <b>${r.count}</b>` : ""}</button>`).join("")}</div>`;
  }

  function bubbleHTML(m, prev) {
    const stacked = prev && prev.is_mine === m.is_mine && new Date(m.created_at) - new Date(prev.created_at) < 5 * 60000;
    return `
      <div class="msg ${m.is_mine ? "mine" : "theirs"} ${stacked ? "stacked" : ""}" data-id="${m.id}">
        <div class="bubble ${m.image_url && !m.text ? "photo-only" : ""}">
          ${m.vibe_info ? `<span class="msg-vibe vibe-${m.vibe_info.key}">${m.vibe_info.emoji} ${VH.esc(m.vibe_info.label)}</span>` : ""}
          ${m.image_url ? `<img class="msg-photo" src="${VH.esc(m.image_url)}" alt="Photo" loading="lazy">` : ""}
          ${m.text ? `<p class="msg-text">${VH.richText(m.text)}</p>` : ""}
          <span class="msg-time">${timeOf(m.created_at)}</span>
          <button type="button" class="msg-more" data-more aria-label="React or more">${VH.icon("smile", "icon-sm")}</button>
        </div>
        ${reactionsHTML(m)}
      </div>`;
  }

  function render({ keepBottom = false } = {}) {
    const stick = keepBottom || nearBottom();
    const fromBottom = scroller.scrollHeight - scroller.scrollTop;
    let html = "";
    let lastDay = "";
    messages.forEach((m, i) => {
      const day = dayLabel(m.created_at);
      if (day !== lastDay) { html += `<div class="day-sep"><span>${day}</span></div>`; lastDay = day; }
      html += bubbleHTML(m, i && dayLabel(messages[i - 1].created_at) === day ? messages[i - 1] : null);
    });
    // "Sent ✓" / "Seen ✓✓" under your latest message
    const lastMine = [...messages].reverse().find((m) => m.is_mine);
    if (!messages.length) {
      html = `<div class="chat-empty">${VH.avatar(conv.other, 72)}<h3>Say hi to ${VH.esc(VH.firstName(conv.other))} 👋</h3>
        <p>Messages here are private between you two.</p></div>`;
    }
    listEl.innerHTML = html;
    if (lastMine) {
      const node = VH.qs(`.msg[data-id="${lastMine.id}"]`, listEl);
      node?.insertAdjacentHTML("beforeend", `<span class="seen ${lastMine.is_read ? "is-seen" : ""}">${lastMine.is_read ? "Seen ✓✓" : "Sent ✓"}</span>`);
    }
    olderEl.innerHTML = hasMore ? `<button class="btn btn-ghost btn-sm" type="button" data-older>Load earlier messages</button>` : "";
    typingEl.hidden = !conv.other_typing;
    if (stick) toBottom(); else scroller.scrollTop = scroller.scrollHeight - fromBottom;
    VH.qsa(".msg-photo", listEl).forEach((img) => img.addEventListener("load", () => { if (stick) toBottom(); }, { once: true }));
  }

  /* ------------------------------------------------------------ loading + live updates */
  async function load(first = false) {
    let data;
    try {
      data = await API.get(`/chats/${id}/messages/`);
    } catch (err) {
      if (first) {
        VH.qs("#chat-shell").innerHTML = VH.emptyState({
          emoji: "💬",
          title: err.status === 404 ? "This chat doesn't exist" : "Couldn't open this chat",
          text: err.status === 404 ? "It may have been removed, or the link is wrong." : VH.esc(err.message),
          action: `<a class="btn btn-primary" href="messages.html">${VH.icon("chats")} Back to messages</a>`,
        });
      }
      return;
    }
    conv = data.conversation;
    const latest = data.messages;
    const newestSeen = messages.length ? messages[messages.length - 1].id : 0;
    if (!first && latest.some((m) => !m.is_mine && m.id > newestSeen)) VH.sound("message");
    const firstLatestId = latest[0]?.id ?? Infinity;
    // keep older messages already loaded, replace the latest window (catches edits, reactions, deletions)
    messages = [...messages.filter((m) => m.id < firstLatestId), ...latest];
    if (first) hasMore = data.has_more;
    const next = JSON.stringify([messages, conv.other_typing, conv.can_message, conv.other]);
    renderHeader();
    renderComposer();
    if (next === signature) { typingEl.hidden = !conv.other_typing; return; }
    signature = next;
    render({ keepBottom: first });
    if (!first) VH.checkChats?.(); // update the unread badge after reading
  }

  async function loadOlder(button) {
    VH.setLoading(button, true);
    try {
      const data = await API.get(`/chats/${id}/messages/?before=${messages[0].id}`);
      const before = scroller.scrollHeight;
      messages = [...data.messages, ...messages];
      hasMore = data.has_more;
      signature = "";
      render();
      scroller.scrollTop = scroller.scrollHeight - before;
    } catch (err) {
      VH.toast(err.message, "error");
      VH.setLoading(button, false);
    }
  }

  /* ------------------------------------------------------------ composer */
  function renderComposer() {
    const mode = conv.can_message ? "open" : "locked";
    if (mode === composerMode) return;
    composerMode = mode;
    if (mode === "locked") {
      composerSlot.innerHTML = `<p class="chat-locked">🔒 You can send messages again once you and ${VH.esc(VH.firstName(conv.other))} follow each other.</p>`;
      return;
    }
    composerSlot.innerHTML = "";
    composerSlot.appendChild(buildComposer());
  }

  function buildComposer() {
    const form = VH.html(`
      <form class="chat-composer" novalidate>
        <div class="chat-attach hidden">
          <img alt="Selected photo">
          <button class="btn-icon" type="button" data-remove-photo aria-label="Remove photo">${VH.icon("x", "icon-sm")}</button>
        </div>
        <div class="chat-vibes hidden" role="radiogroup" aria-label="Attach a vibe">
          ${VH.VIBES.map((v) => `<button type="button" class="vibe-chip vibe-${v.key}" data-vibe="${v.key}" role="radio" aria-checked="false"><span class="emo">${v.emoji}</span>${v.label}</button>`).join("")}
        </div>
        <div class="chat-row-input">
          <label class="btn-icon" title="Photo from gallery" aria-label="Send a photo from your gallery">
            ${VH.icon("image")}<input type="file" accept="image/*" hidden data-gallery>
          </label>
          <button class="btn-icon" type="button" data-camera title="Take a photo" aria-label="Take a photo">${VH.icon("camera")}</button>
          <input type="file" accept="image/*" capture="environment" hidden data-camera-input>
          <button class="btn-icon vibe-toggle" type="button" data-vibe-toggle title="Add a vibe" aria-label="Add a vibe">${VH.icon("sparkles")}</button>
          <textarea rows="1" maxlength="1000" placeholder="Message…" aria-label="Write a message"></textarea>
          <button class="chat-send" type="submit" aria-label="Send" disabled>${VH.icon("send")}</button>
        </div>
      </form>`);

    const textarea = VH.qs("textarea", form);
    const send = VH.qs(".chat-send", form);
    const attach = VH.qs(".chat-attach", form);
    const vibesRow = VH.qs(".chat-vibes", form);
    const vibeToggle = VH.qs("[data-vibe-toggle]", form);
    let photo = null;
    let vibe = "";
    let lastTypingPing = 0;

    const update = () => {
      send.disabled = !textarea.value.trim() && !photo;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    };

    async function setPhoto(file) {
      if (!file) return;
      const shrunk = await VH.shrinkImage(file);
      const problem = VH.checkImage(shrunk);
      if (problem) { VH.toast(problem, "error"); return; }
      photo = shrunk;
      VH.qs("img", attach).src = URL.createObjectURL(shrunk);
      attach.classList.remove("hidden");
      update();
      if (!matchMedia("(pointer: coarse)").matches) textarea.focus();
    }

    VH.qs("[data-gallery]", form).addEventListener("change", (e) => { setPhoto(e.target.files[0]); e.target.value = ""; });
    VH.qs("[data-camera-input]", form).addEventListener("change", (e) => { setPhoto(e.target.files[0]); e.target.value = ""; });
    VH.qs("[data-camera]", form).addEventListener("click", async () => {
      if (matchMedia("(pointer: coarse)").matches || !navigator.mediaDevices?.getUserMedia) VH.qs("[data-camera-input]", form).click();
      else setPhoto(await VH.openCamera());
    });
    VH.qs("[data-remove-photo]", form).addEventListener("click", () => { photo = null; attach.classList.add("hidden"); update(); });

    vibeToggle.addEventListener("click", () => vibesRow.classList.toggle("hidden"));
    vibesRow.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-vibe]");
      if (!chip) return;
      vibe = vibe === chip.dataset.vibe ? "" : chip.dataset.vibe;
      VH.qsa(".vibe-chip", vibesRow).forEach((c) => {
        c.classList.toggle("selected", c.dataset.vibe === vibe);
        c.setAttribute("aria-checked", c.dataset.vibe === vibe);
      });
      const picked = VH.VIBES.find((v) => v.key === vibe);
      vibeToggle.classList.toggle("active", !!picked);
      vibeToggle.innerHTML = picked ? `<span class="emo">${picked.emoji}</span>` : VH.icon("sparkles");
      if (picked) vibesRow.classList.add("hidden");
      if (!matchMedia("(pointer: coarse)").matches) textarea.focus();
    });

    textarea.addEventListener("input", () => {
      update();
      if (textarea.value.trim() && Date.now() - lastTypingPing > 2500) {
        lastTypingPing = Date.now();
        API.post(`/chats/${id}/typing/`).catch(() => {});
      }
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !matchMedia("(pointer: coarse)").matches) {
        e.preventDefault();
        if (!send.disabled) form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = textarea.value.trim();
      if (!text && !photo) return;
      const data = new FormData();
      data.append("text", text);
      if (vibe) data.append("vibe", vibe);
      if (photo) data.append("image", photo);
      send.disabled = true;
      send.classList.add("sending");
      try {
        const message = await API.post(`/chats/${id}/messages/`, data);
        VH.sound("sent");
        messages.push(message);
        signature = "";
        render({ keepBottom: true });
        textarea.value = "";
        photo = null;
        attach.classList.add("hidden");
        if (vibe) VH.qs(`[data-vibe="${vibe}"]`, vibesRow).click();
        lastTypingPing = 0;
      } catch (err) {
        VH.toast(err.message, "error");
        if (err.status === 403) load();
      } finally {
        send.classList.remove("sending");
        update();
        textarea.focus();
      }
    });
    // Laptops: ready to type. Phones: the keyboard only opens when you tap the box.
    if (!matchMedia("(pointer: coarse)").matches) setTimeout(() => textarea.focus(), 50);
    return form;
  }

  /* ------------------------------------------------------------ reactions + delete */
  async function react(messageId, emoji) {
    try {
      const updated = await API.post(`/messages/${messageId}/react/`, { emoji });
      messages = messages.map((m) => (m.id === updated.id ? updated : m));
      signature = "";
      render();
      const node = VH.qs(`.msg[data-id="${messageId}"] .msg-reactions`, listEl);
      node?.classList.add("pop");
    } catch (err) {
      VH.toast(err.message, "error");
    }
  }

  async function removeMessage(messageId) {
    const ok = await VH.confirm("This message will be deleted for both of you.", { title: "Delete message?" });
    if (!ok) return;
    try {
      await API.del(`/messages/${messageId}/`);
      messages = messages.filter((m) => m.id !== messageId);
      signature = "";
      render();
      VH.toast("Message deleted.");
    } catch (err) {
      VH.toast(err.message, "error");
    }
  }

  function closeReactionMenu() { VH.qsa(".reaction-menu").forEach((m) => m.remove()); }

  function openReactionMenu(msgEl) {
    closeReactionMenu();
    const messageId = Number(msgEl.dataset.id);
    const m = messages.find((x) => x.id === messageId);
    if (!m) return;
    const mine = new Set(m.reactions.filter((r) => r.mine).map((r) => r.emoji));
    const menu = VH.html(`
      <div class="reaction-menu" role="menu">
        <div class="reaction-pick">${REACTIONS.map((e) => `<button type="button" data-pick="${e}" class="${mine.has(e) ? "mine" : ""}" aria-label="React ${e}">${e}</button>`).join("")}</div>
        ${m.is_mine ? `<button type="button" class="reaction-delete" data-delete>${VH.icon("trash", "icon-sm")} Delete</button>` : ""}
      </div>`);
    document.body.appendChild(menu);
    const r = VH.qs(".bubble", msgEl).getBoundingClientRect();
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const left = Math.min(Math.max(8, m.is_mine ? r.right - w : r.left), innerWidth - w - 8);
    const top = r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (pick) react(messageId, pick.dataset.pick);
      if (e.target.closest("[data-delete]")) removeMessage(messageId);
      closeReactionMenu();
    });
  }

  listEl.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-react]");
    if (chip) { react(Number(chip.closest(".msg").dataset.id), chip.dataset.react); return; }
    if (e.target.closest("[data-more]")) { openReactionMenu(e.target.closest(".msg")); return; }
    const img = e.target.closest(".msg-photo");
    if (img) VH.lightbox(img.src);
  });
  // Double-click (laptop) or double-tap (phone) = ❤️
  listEl.addEventListener("dblclick", (e) => {
    const msg = e.target.closest(".msg");
    if (msg && !e.target.closest("button")) { window.getSelection()?.removeAllRanges(); react(Number(msg.dataset.id), "❤️"); }
  });
  let lastTap = { id: 0, at: 0 };
  let pressTimer = null;
  let longPressed = false;
  listEl.addEventListener("touchstart", (e) => {
    const msg = e.target.closest(".msg");
    longPressed = false;
    if (!msg || e.target.closest("button")) return;
    pressTimer = setTimeout(() => { pressTimer = null; longPressed = true; navigator.vibrate?.(15); openReactionMenu(msg); }, 450);
  }, { passive: true });
  listEl.addEventListener("touchmove", () => { clearTimeout(pressTimer); pressTimer = null; }, { passive: true });
  listEl.addEventListener("touchend", (e) => {
    clearTimeout(pressTimer);
    pressTimer = null;
    if (longPressed) { e.preventDefault(); longPressed = false; return; } // the menu is open – don't also "tap"
    const msg = e.target.closest(".msg");
    if (!msg || e.target.closest("button")) return;
    const now = Date.now();
    if (lastTap.id === msg.dataset.id && now - lastTap.at < 320) {
      e.preventDefault();
      react(Number(msg.dataset.id), "❤️");
      lastTap = { id: 0, at: 0 };
    } else {
      lastTap = { id: msg.dataset.id, at: now };
    }
  });
  listEl.addEventListener("contextmenu", (e) => {
    const msg = e.target.closest(".msg");
    if (msg) { e.preventDefault(); openReactionMenu(msg); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".reaction-menu, [data-more]")) closeReactionMenu(); });
  scroller.addEventListener("scroll", closeReactionMenu, { passive: true });
  olderEl.addEventListener("click", (e) => { const b = e.target.closest("[data-older]"); if (b) loadOlder(b); });

  /* ------------------------------------------------------------ phone layout */
  const shell = VH.qs("#chat-shell");
  const phone = matchMedia("(max-width: 720px)");
  function fitToScreen() {
    const root = document.documentElement.style;
    if (!phone.matches) { root.removeProperty("--chat-top"); root.removeProperty("--chat-h"); return; }
    const stick = nearBottom();
    const top = VH.qs(".mobile-top")?.offsetHeight || 0;
    const visible = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    root.setProperty("--chat-top", `${top}px`);
    root.setProperty("--chat-h", `${Math.max(240, visible - top)}px`);
    window.scrollTo(0, 0); // never let the page itself scroll the header away
    if (stick) toBottom();
  }
  window.visualViewport?.addEventListener("resize", fitToScreen);
  window.visualViewport?.addEventListener("scroll", () => window.scrollTo(0, 0));
  addEventListener("resize", fitToScreen);
  phone.addEventListener?.("change", fitToScreen);
  document.addEventListener("focusin", () => setTimeout(fitToScreen, 250));
  fitToScreen();

  /* ------------------------------------------------------------ start */
  if (!id) {
    location.replace("messages.html");
    return;
  }
  load(true);
  setInterval(() => { if (document.visibilityState === "visible" && conv) load(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && conv) load(); });
})();
