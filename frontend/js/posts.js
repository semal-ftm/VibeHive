/* ==========================================================================
   posts.js — post cards, likes, comments, edit/delete and paginated feeds.
   Used by the home feed, explore, profile and single-post pages.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */
function likeButtonInner(post) {
  return `
    <span class="heart-wrap">${VH.icon("heart")}</span>
    <span class="count">${VH.compact(post.like_count)}</span>
    <span class="like-label">${post.is_liked ? "Liked" : "Like"}</span>`;
}

VH.renderPost = (post) => {
  const author = post.author;
  const el = VH.html(`
    <article class="card post" data-post-id="${post.id}">
      <header class="post-head">
        <a href="${VH.profileUrl(author)}">${VH.avatar(author, 46)}</a>
        <div class="post-author">
          <div class="post-author-line">
            <a class="name" href="${VH.profileUrl(author)}">${VH.esc(VH.displayName(author))}</a>
            <span class="handle">@${VH.esc(author.username)}</span>
            <span class="dot">·</span>
            <a class="time" href="post.html?id=${post.id}"><time datetime="${post.created_at}" title="${VH.fullDate(post.created_at)}">${VH.timeAgo(post.created_at)}</time></a>
          </div>
          ${VH.vibeBadge(post.vibe_info)}
        </div>
        ${post.is_owner ? `
          <div class="menu-wrap">
            <button class="btn-icon" type="button" data-post-action="menu" aria-label="Post options" aria-haspopup="true">${VH.icon("more")}</button>
          </div>` : ""}
      </header>
      ${post.content ? `<p class="post-text">${VH.richText(post.content)}</p>` : ""}
      ${post.image_url ? `
        <div class="post-image">
          <img src="${VH.esc(post.image_url)}" alt="Image shared by ${VH.esc(author.username)}" loading="lazy" data-post-action="zoom">
        </div>` : ""}
      <footer class="post-actions">
        <button class="action-btn like ${post.is_liked ? "liked" : ""}" type="button" data-post-action="like"
          aria-pressed="${post.is_liked}" aria-label="Like">${likeButtonInner(post)}</button>
        <button class="action-btn comment" type="button" data-post-action="comments" aria-expanded="false" aria-label="Comments">
          ${VH.icon("message")}<span class="count">${VH.compact(post.comment_count)}</span>
        </button>
      </footer>
      <section class="comments" aria-label="Comments">
        <div class="comment-list"></div>
        <form class="comment-form" novalidate>
          ${VH.avatar(VH.me, 34)}
          <input class="input" name="comment" maxlength="300" placeholder="Join the buzz..." autocomplete="off" aria-label="Write a comment">
          <button class="btn-icon" type="submit" disabled aria-label="Send comment">${VH.icon("send", "icon-sm")}</button>
        </form>
      </section>
    </article>`);
  el._post = post; // keep the data on the element for later updates
  return el;
};

VH.renderComment = (comment) => `
  <div class="comment" data-comment-id="${comment.id}">
    <a href="${VH.profileUrl(comment.author)}">${VH.avatar(comment.author, 34)}</a>
    <div class="comment-bubble">
      <div class="comment-head">
        <a class="name" href="${VH.profileUrl(comment.author)}">${VH.esc(VH.displayName(comment.author))}</a>
        <time class="time" datetime="${comment.created_at}" title="${VH.fullDate(comment.created_at)}">${VH.timeAgo(comment.created_at)}</time>
        ${comment.is_owner ? `<button class="btn-icon" type="button" data-post-action="delete-comment" aria-label="Delete comment">${VH.icon("trash", "icon-sm")}</button>` : ""}
      </div>
      <p class="comment-text">${VH.richText(comment.content)}</p>
    </div>
  </div>`;

VH.postSkeleton = () => `
  <div class="card sk-post">
    <div class="sk-row"><span class="skeleton sk-circle"></span>
      <div style="flex:1"><div class="skeleton sk-line" style="width:40%;margin:0"></div><div class="skeleton sk-line" style="width:25%"></div></div>
    </div>
    <div class="skeleton sk-line" style="width:92%;margin-top:18px"></div>
    <div class="skeleton sk-line" style="width:70%"></div>
    <div class="skeleton sk-block"></div>
  </div>`;

/* --------------------------------------------------------------------------
   Interactions
   -------------------------------------------------------------------------- */
function setCount(card, selector, value) {
  VH.qs(`${selector} .count`, card).textContent = VH.compact(value);
}

function heartBurst(button) {
  const wrap = VH.qs(".heart-wrap", button);
  const bits = ["❤️", "🐝", "✨", "💛", "❤️", "✨"];
  bits.forEach((bit, i) => {
    const angle = (i / bits.length) * Math.PI * 2;
    const span = document.createElement("span");
    span.className = "heart-burst";
    span.textContent = bit;
    span.style.setProperty("--dx", `${Math.cos(angle) * 26}px`);
    span.style.setProperty("--dy", `${Math.sin(angle) * 26}px`);
    wrap.appendChild(span);
    span.addEventListener("animationend", () => span.remove());
  });
}

async function toggleLike(card, button) {
  const post = card._post;
  const liking = !post.is_liked;
  // Optimistic UI: update immediately, roll back if the request fails
  post.is_liked = liking;
  post.like_count += liking ? 1 : -1;
  button.classList.toggle("liked", liking);
  button.setAttribute("aria-pressed", liking);
  button.innerHTML = likeButtonInner(post);
  if (liking) {
    button.classList.remove("pop");
    void button.offsetWidth;
    button.classList.add("pop");
    heartBurst(button);
  }
  button.disabled = true;
  try {
    const result = liking ? await API.post(`/posts/${post.id}/like/`) : await API.del(`/posts/${post.id}/like/`);
    post.is_liked = result.liked;
    post.like_count = result.like_count;
    setCount(card, ".like", post.like_count);
    if (liking) VH.toast("Post liked ❤️");
  } catch (err) {
    post.is_liked = !liking;
    post.like_count += liking ? -1 : 1;
    button.classList.toggle("liked", post.is_liked);
    button.innerHTML = likeButtonInner(post);
    VH.toast(err.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function loadComments(card) {
  const list = VH.qs(".comment-list", card);
  list.innerHTML = VH.skeletonRows(2);
  try {
    const comments = await API.get(`/posts/${card._post.id}/comments/`);
    card._commentsLoaded = true;
    renderCommentList(card, comments);
  } catch (err) {
    list.innerHTML = `<p class="comments-empty">${VH.esc(err.message)}</p>`;
  }
}

function renderCommentList(card, comments) {
  const list = VH.qs(".comment-list", card);
  list.innerHTML = comments.length
    ? comments.map(VH.renderComment).join("")
    : `<div class="comments-empty"><strong>💬</strong>Be the first to join the buzz.</div>`;
}

VH.openComments = (card, focus = true) => {
  const section = VH.qs(".comments", card);
  const button = VH.qs('[data-post-action="comments"]', card);
  const open = !section.classList.contains("open");
  section.classList.toggle("open", open);
  button.setAttribute("aria-expanded", open);
  if (open && !card._commentsLoaded) loadComments(card);
  if (open && focus) VH.qs(".comment-form input", card).focus();
};

async function submitComment(card, form) {
  const input = VH.qs("input", form);
  const button = VH.qs("button", form);
  const content = input.value.trim();
  if (!content) return;
  button.disabled = true;
  input.disabled = true;
  try {
    const comment = await API.post(`/posts/${card._post.id}/comments/`, { content });
    const list = VH.qs(".comment-list", card);
    VH.qs(".comments-empty", list)?.remove();
    list.insertAdjacentHTML("beforeend", VH.renderComment(comment));
    card._post.comment_count += 1;
    setCount(card, ".comment", card._post.comment_count);
    input.value = "";
    VH.toast("Comment added.");
  } catch (err) {
    VH.toast(err.message, "error");
  } finally {
    input.disabled = false;
    input.focus();
    button.disabled = !input.value.trim();
  }
}

async function deleteComment(card, commentEl) {
  const ok = await VH.confirm("This comment will be removed from the post.", { title: "Delete comment?" });
  if (!ok) return;
  try {
    await API.del(`/comments/${commentEl.dataset.commentId}/`);
    commentEl.remove();
    card._post.comment_count = Math.max(0, card._post.comment_count - 1);
    setCount(card, ".comment", card._post.comment_count);
    if (!VH.qs(".comment", card)) renderCommentList(card, []);
    VH.toast("Comment deleted.");
  } catch (err) {
    VH.toast(err.message, "error");
  }
}

async function deletePost(card) {
  const ok = await VH.confirm("This can't be undone. The post, its likes and comments will be gone for good.", { title: "Delete this post?" });
  if (!ok) return;
  try {
    await API.del(`/posts/${card._post.id}/`);
    card.classList.add("removing");
    card.addEventListener("animationend", () => card.remove(), { once: true });
    VH.toast("Post deleted.");
    document.dispatchEvent(new CustomEvent("vh:post-deleted", { detail: card._post }));
    VH.refreshMe();
  } catch (err) {
    VH.toast(err.message, "error");
  }
}

function editPost(card) {
  if (VH.qs(".post-edit", card)) return;
  const post = card._post;
  const textEl = VH.qs(".post-text", card);
  const editor = VH.html(`
    <div class="post-edit">
      <textarea class="textarea" maxlength="${VH.MAX_POST_LENGTH}" aria-label="Edit post">${VH.esc(post.content)}</textarea>
      <div class="post-edit-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-cancel>Cancel</button>
        <button class="btn btn-primary btn-sm" type="button" data-save>Save</button>
      </div>
    </div>`);
  textEl ? textEl.replaceWith(editor) : VH.qs(".post-head", card).after(editor);
  const textarea = VH.qs("textarea", editor);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  const restore = () => {
    editor.replaceWith(post.content ? VH.html(`<p class="post-text">${VH.richText(post.content)}</p>`) : document.createTextNode(""));
  };
  VH.qs("[data-cancel]", editor).addEventListener("click", restore);
  VH.qs("[data-save]", editor).addEventListener("click", async (e) => {
    const content = textarea.value.trim();
    if (!content && !post.image_url) { VH.toast("Your post can't be empty.", "error"); return; }
    VH.setLoading(e.currentTarget, true);
    try {
      const updated = await API.patch(`/posts/${post.id}/`, { content });
      post.content = updated.content;
      restore();
      VH.toast("Post updated.");
    } catch (err) {
      VH.toast(err.message, "error");
      VH.setLoading(e.currentTarget, false);
    }
  });
}

function openPostMenu(card, button) {
  closeMenus();
  const menu = VH.html(`
    <div class="menu" role="menu">
      <button type="button" role="menuitem" data-menu="edit">${VH.icon("edit", "icon-sm")} Edit post</button>
      <button type="button" role="menuitem" class="danger" data-menu="delete">${VH.icon("trash", "icon-sm")} Delete post</button>
    </div>`);
  button.after(menu);
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-menu]");
    if (!item) return;
    closeMenus();
    if (item.dataset.menu === "edit") editPost(card);
    if (item.dataset.menu === "delete") deletePost(card);
  });
}

function closeMenus() {
  VH.qsa(".menu:not(.account-menu)").forEach((m) => m.remove());
}

/* Delegated listeners: one set for every post on the page */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu") && !e.target.closest('[data-post-action="menu"], [data-action="account"]')) closeMenus();
  const actionEl = e.target.closest("[data-post-action]");
  if (!actionEl) return;
  const card = actionEl.closest(".post");
  if (!card) return;
  const action = actionEl.dataset.postAction;
  if (action === "like" && !actionEl.disabled) toggleLike(card, actionEl);
  if (action === "comments") VH.openComments(card);
  if (action === "menu") VH.qs(".menu", card) ? closeMenus() : openPostMenu(card, actionEl);
  if (action === "zoom") VH.lightbox(actionEl.src);
  if (action === "delete-comment") deleteComment(card, actionEl.closest(".comment"));
});

document.addEventListener("input", (e) => {
  const form = e.target.closest(".comment-form");
  if (form) VH.qs("button", form).disabled = !e.target.value.trim();
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest(".comment-form");
  if (!form) return;
  e.preventDefault();
  submitComment(form.closest(".post"), form);
});

/* --------------------------------------------------------------------------
   Paginated feed with infinite scroll
   -------------------------------------------------------------------------- */
VH.PostFeed = class {
  /**
   * @param {HTMLElement} container  where post cards go
   * @param {object} options
   *   params      query string for /api/posts/ (e.g. "feed=following")
   *   empty       HTML shown when there are no posts
   *   acceptNew   (post) => boolean — prepend freshly created posts?
   */
  constructor(container, { params = "", empty = "", acceptNew = null } = {}) {
    this.container = container;
    this.params = params;
    this.empty = empty;
    this.acceptNew = acceptNew;
    this.next = null;
    this.loading = false;

    this.list = VH.html('<div class="feed"></div>');
    this.footer = VH.html('<div class="load-more"></div>');
    container.replaceChildren(this.list, this.footer);

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.next && !this.loading) this.loadMore();
    }, { rootMargin: "400px" });
    this.observer.observe(this.footer);

    if (acceptNew) {
      document.addEventListener("vh:post-created", (e) => {
        if (this.list.isConnected && this.acceptNew(e.detail)) this.prepend(e.detail);
      });
    }
    document.addEventListener("vh:post-deleted", () => {
      setTimeout(() => {
        if (this.list.isConnected && !VH.qs(".post", this.list)) this.showEmpty();
      }, 350);
    });
  }

  async load(params = this.params) {
    this.params = params;
    this.next = null;
    this.list.innerHTML = VH.postSkeleton() + VH.postSkeleton();
    this.footer.innerHTML = "";
    await this.fetchPage(`/posts/?${this.params}`, true);
  }

  async loadMore() {
    this.footer.innerHTML = '<span class="spinner" style="color:var(--primary)"></span>';
    await this.fetchPage(this.next, false);
  }

  async fetchPage(url, replace) {
    this.loading = true;
    try {
      const data = await API.get(url);
      if (replace) this.list.innerHTML = "";
      data.results.forEach((post) => this.list.appendChild(VH.renderPost(post)));
      this.next = data.next;
      if (!data.results.length && replace) this.showEmpty();
      else this.footer.innerHTML = this.next ? "" : `<p class="feed-end">You're all caught up 🐝</p>`;
    } catch (err) {
      if (replace) this.list.innerHTML = "";
      this.footer.innerHTML = `
        <div class="card empty-state" style="width:100%">
          <div class="empty-hex">😵</div><h3>Couldn't load the buzz</h3><p>${VH.esc(err.message)}</p>
          <button class="btn btn-outline" type="button" data-retry>Try again</button>
        </div>`;
      VH.qs("[data-retry]", this.footer).addEventListener("click", () => (replace ? this.load() : this.loadMore()));
    } finally {
      this.loading = false;
    }
  }

  showEmpty() {
    this.list.innerHTML = `<div class="card">${this.empty}</div>`;
    this.footer.innerHTML = "";
  }

  prepend(post) {
    VH.qs(".empty-state", this.list)?.closest(".card")?.remove();
    this.list.prepend(VH.renderPost(post));
  }
};
