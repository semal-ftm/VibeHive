/* ==========================================================================
   profile.js — profile page: header card, follow/edit, posts and
   followers/following tabs, and the edit-profile modal.
   profile.html          → your own profile
   profile.html?id=<id>  → someone else's profile
   ========================================================================== */

(() => {
  const params = new URLSearchParams(location.search);
  const cachedMe = API.session.user;
  const requestedId = Number(params.get("id")) || null;
  const isOwn = !requestedId || (cachedMe && requestedId === cachedMe.id);

  if (!VH.initPage({ active: isOwn ? "profile" : "", rightbar: ["search", "suggested", "vibes", "info"] })) return;

  const cardSlot = VH.qs("#profile-card");
  const tabs = VH.qs("#profile-tabs");
  const content = VH.qs("#profile-content");
  let user = null;
  let activeTab = "posts";
  let feed = null;

  /* ---------- load ---------- */
  async function loadProfile() {
    try {
      user = isOwn ? await API.get("/profile/") : await API.get(`/users/${requestedId}/`);
      if (isOwn) {
        VH.me = user;
        API.session.setUser(user);
      }
      document.title = `${VH.displayName(user)} (@${user.username}) · VibeHive`;
      renderCard();
      VH.renderVibeMatch(VH.qs("#vibe-match"), user);
      VH.renderVibeCalendar(VH.qs("#vibe-calendar"), user);
      tabs.classList.remove("hidden");
      showTab(params.get("tab") || "posts");
    } catch (err) {
      cardSlot.innerHTML = `<div class="card">${VH.emptyState({
        emoji: "🔍",
        title: err.status === 404 ? "No one found in the hive." : "Couldn't load this profile",
        text: err.status === 404 ? "This member may have left, or the link is wrong." : VH.esc(err.message),
        action: `<a class="btn btn-primary" href="explore.html">${VH.icon("compass")} Explore the hive</a>`,
      })}</div>`;
    }
  }

  /* ---------- header card ---------- */
  function renderCard() {
    const own = user.is_me;
    cardSlot.innerHTML = `
      <section class="card profile-card">
        <div class="profile-cover"></div>
        <div class="profile-body">
          <div class="profile-top">
            ${VH.avatar(user, 112)}
            <div class="profile-actions">
              ${own
                ? `<button class="btn btn-outline" type="button" data-edit-profile>${VH.icon("edit", "icon-sm")} Edit Profile</button>`
                : `${user.is_mutual ? `<button class="btn btn-outline" type="button" data-message-user="${user.id}">${VH.icon("chats", "icon-sm")} Message</button>` : ""}${VH.followButton(user, "")}`}
            </div>
          </div>
          <h1 class="profile-name">${VH.esc(VH.displayName(user))}</h1>
          <div class="profile-handle">
            @${VH.esc(user.username)}
            ${user.is_mutual ? '<span class="follows-you mutual">🤝 You follow each other</span>'
              : user.follows_you ? '<span class="follows-you">Follows you</span>' : ""}
          </div>
          ${user.bio
            ? `<p class="profile-bio">${VH.richText(user.bio)}</p>`
            : own ? `<p class="profile-bio text-muted">Add a bio so the hive knows your vibe ✨</p>` : ""}
          <div class="profile-meta">
            <span>${VH.icon("calendar", "icon-sm")} Joined ${VH.joinDate(user.date_joined)}</span>
            ${own && user.email ? `<span>${VH.icon("mail", "icon-sm")} ${VH.esc(user.email)}</span>` : ""}
          </div>
          <div class="profile-stats">
            <button class="stat" type="button" data-stat="posts"><strong data-count="posts">${VH.compact(user.posts_count)}</strong><span>Posts</span></button>
            <button class="stat" type="button" data-stat="followers"><strong data-count="followers">${VH.compact(user.followers_count)}</strong><span>Followers</span></button>
            <button class="stat" type="button" data-stat="following"><strong data-count="following">${VH.compact(user.following_count)}</strong><span>Following</span></button>
          </div>
        </div>
      </section>`;

    VH.qs("[data-edit-profile]", cardSlot)?.addEventListener("click", openEditProfile);
    VH.qs("[data-message-user]", cardSlot)?.addEventListener("click", (e) => VH.startChat(user.id, e.currentTarget));
    VH.qsa("[data-stat]", cardSlot).forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.stat)));
  }

  function setCount(name, value) {
    const el = VH.qs(`[data-count="${name}"]`, cardSlot);
    if (el) el.textContent = VH.compact(Math.max(0, value));
  }

  /* ---------- tabs ---------- */
  function showTab(tab) {
    activeTab = ["posts", "followers", "following"].includes(tab) ? tab : "posts";
    VH.qsa("[data-tab]", tabs).forEach((btn) => {
      const active = btn.dataset.tab === activeTab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active);
    });
    if (activeTab === "posts") showPosts();
    else showPeople(activeTab);
  }

  VH.qsa("[data-tab]", tabs).forEach((btn) => btn.addEventListener("click", () => showTab(btn.dataset.tab)));

  /** Shown instead of posts when you don't follow each other yet. */
  function lockedHTML() {
    const name = `@${VH.esc(user.username)}`;
    const [title, text, action] =
      user.is_following
        ? [`You follow ${name} 🐝`, "Their posts will appear here as soon as they follow you back.", ""]
        : user.follows_you
          ? [`${name} follows you`, "Follow back and you'll both see each other's vibes.", VH.followButton(user, "")]
          : [`${name}'s vibes are for their hive`, `Follow ${name}. Once you follow each other, you'll see each other's posts.`, VH.followButton(user, "")];
    return `<div class="card locked-state">${VH.emptyState({ emoji: "🔒", title, text, action })}</div>`;
  }

  function showPosts() {
    if (!user.can_see_posts) {
      content.innerHTML = lockedHTML();
      return;
    }
    const empty = user.is_me
      ? VH.emptyState({
          emoji: "✍️",
          title: "You haven't shared a vibe yet",
          text: "Your first post is the start of your hive.",
          action: `<button class="btn btn-primary" type="button" data-action="compose">${VH.icon("plus")} Share your first vibe</button>`,
        })
      : VH.emptyState({ emoji: "🌙", title: `@${VH.esc(user.username)} hasn't shared a vibe yet`, text: "Check back soon — the buzz is coming." });

    content.innerHTML = "";
    feed = new VH.PostFeed(content, {
      empty,
      acceptNew: (post) => activeTab === "posts" && post.author.id === user.id,
    });
    feed.load(`author=${user.id}`);
  }

  async function showPeople(kind) {
    content.innerHTML = `<div class="card list-card">${VH.skeletonRows(4)}</div>`;
    const list = VH.qs(".list-card", content);
    const render = async (url, replace) => {
      try {
        const data = await API.get(url);
        if (replace) list.innerHTML = "";
        VH.qs("[data-more]", list)?.remove();
        if (!data.results.length && replace) {
          list.innerHTML = kind === "followers"
            ? VH.emptyState({
                emoji: "🌱",
                title: user.is_me ? "Your hive is just getting started." : "No followers yet",
                text: user.is_me ? "Share a few vibes and people will find you." : `Be the first to join @${VH.esc(user.username)}'s hive.`,
              })
            : VH.emptyState({
                emoji: "🧭",
                title: user.is_me ? "You're not following anyone yet" : "Not following anyone yet",
                text: user.is_me ? "Find more people for your hive." : "",
                action: user.is_me ? `<a class="btn btn-primary" href="explore.html">${VH.icon("compass")} Find people</a>` : "",
              });
          return;
        }
        list.insertAdjacentHTML("beforeend", data.results.map((u) => VH.userRow(u, { bio: true })).join(""));
        if (data.next) {
          const more = VH.html(`<div class="load-more" data-more><button class="btn btn-outline btn-sm" type="button">Load more</button></div>`);
          list.appendChild(more);
          VH.qs("button", more).addEventListener("click", () => render(data.next, false));
        }
      } catch (err) {
        list.innerHTML = `<p class="empty-state text-muted">${VH.esc(err.message)}</p>`;
      }
    };
    render(`/users/${user.id}/${kind}/`, true);
  }

  /* ---------- live counters ---------- */
  document.addEventListener("vh:follow-changed", (e) => {
    if (!user) return;
    const { userId, following, followersCount } = e.detail;
    if (userId === user.id) {
      user.followers_count = followersCount;
      user.is_following = following;
      setCount("followers", followersCount);
      refreshAccess();
    } else if (user.is_me) {
      user.following_count += following ? 1 : -1;
      setCount("following", user.following_count);
    }
  });

  /** Following/unfollowing can lock or unlock their posts, calendar and vibe DNA. */
  async function refreshAccess() {
    try {
      user = await API.get(`/users/${user.id}/`);
    } catch { return; }
    renderCard();
    VH.renderVibeMatch(VH.qs("#vibe-match"), user);
    VH.renderVibeCalendar(VH.qs("#vibe-calendar"), user);
    if (activeTab === "posts") showPosts();
  }

  document.addEventListener("vh:post-created", (e) => {
    if (!user || e.detail.author.id !== user.id) return;
    setCount("posts", ++user.posts_count);
    // A new post paints today's square and may change your vibe DNA
    VH.renderVibeCalendar(VH.qs("#vibe-calendar"), user);
    VH.renderVibeMatch(VH.qs("#vibe-match"), user);
  });
  document.addEventListener("vh:post-deleted", (e) => {
    if (user && e.detail.author.id === user.id) setCount("posts", --user.posts_count);
  });

  /* ---------- edit profile modal ---------- */
  function openEditProfile() {
    let newAvatar = null;
    let removeAvatar = false;

    const form = VH.html(`
      <form novalidate>
        <div class="avatar-edit">
          <span data-avatar-preview>${VH.avatar(user, 84)}</span>
          <div>
            <div class="actions">
              <label class="btn btn-outline btn-sm">${VH.icon("camera", "icon-sm")} Upload photo
                <input type="file" accept="image/*" hidden>
              </label>
              <button class="btn btn-ghost btn-sm" type="button" data-remove ${user.avatar ? "" : "hidden"}>Remove</button>
            </div>
            <p class="hint text-muted" style="font-size:12px;margin-top:6px">JPG, PNG, GIF or WebP · max 5 MB</p>
          </div>
        </div>
        <div class="field">
          <label for="edit-name">Full name</label>
          <input class="input" id="edit-name" name="full_name" maxlength="80" value="${VH.esc(user.full_name || "")}" placeholder="Your name">
        </div>
        <div class="field">
          <label for="edit-bio">Bio</label>
          <textarea class="textarea" id="edit-bio" name="bio" maxlength="280" rows="3" placeholder="Tell the hive about your vibe...">${VH.esc(user.bio || "")}</textarea>
          <span class="hint" data-bio-count></span>
        </div>
        <p class="field-error" data-form-error></p>
        <div class="modal-footer">
          <button class="btn btn-outline" type="button" data-cancel>Cancel</button>
          <button class="btn btn-primary" type="submit">Save changes</button>
        </div>
      </form>`);

    const modal = VH.openModal({ title: "Edit profile", body: form });
    const fileInput = VH.qs("input[type=file]", form);
    const preview = VH.qs("[data-avatar-preview]", form);
    const removeBtn = VH.qs("[data-remove]", form);
    const errorEl = VH.qs("[data-form-error]", form);
    const bio = VH.qs("#edit-bio", form);
    const bioCount = VH.qs("[data-bio-count]", form);

    const updateBioCount = () => (bioCount.textContent = `${bio.value.length}/280`);
    bio.addEventListener("input", updateBioCount);
    updateBioCount();

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      const problem = VH.checkImage(file);
      if (problem) { errorEl.textContent = problem; fileInput.value = ""; return; }
      errorEl.textContent = "";
      newAvatar = file;
      removeAvatar = false;
      preview.innerHTML = VH.avatar({ ...user, avatar: URL.createObjectURL(file) }, 84);
      removeBtn.hidden = false;
    });

    removeBtn.addEventListener("click", () => {
      newAvatar = null;
      removeAvatar = true;
      fileInput.value = "";
      preview.innerHTML = VH.avatar({ ...user, avatar: null }, 84);
      removeBtn.hidden = true;
    });

    VH.qs("[data-cancel]", form).addEventListener("click", modal.close);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.textContent = "";
      const data = new FormData();
      data.append("full_name", form.full_name.value.trim());
      data.append("bio", form.bio.value.trim());
      if (newAvatar) data.append("avatar", newAvatar);
      if (removeAvatar) data.append("remove_avatar", "true");

      const button = VH.qs("button[type=submit]", form);
      VH.setLoading(button, true, "Saving...");
      try {
        user = await API.put("/profile/", data);
        VH.me = user;
        API.session.setUser(user);
        renderCard();
        VH.refreshMe();
        if (activeTab === "posts") showPosts(); // refresh avatars on your posts
        modal.close();
        VH.toast("Profile updated successfully.");
      } catch (err) {
        errorEl.textContent = err.message;
        VH.setLoading(button, false);
      }
    });
  }

  loadProfile();
})();
