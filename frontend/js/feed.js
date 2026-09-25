/* ==========================================================================
   feed.js — home page: greeting, composer and your hive's feed
   (your own posts + posts from mutual followers)
   ========================================================================== */

(() => {
  const me = VH.initPage({ active: "home" });
  if (!me) return;

  /* Greeting based on the time of day */
  const hour = new Date().getHours();
  const moment =
    hour < 5 ? "Burning the midnight oil? 🌙" :
    hour < 12 ? "Good morning! Fresh vibes only ☀️" :
    hour < 18 ? "Good afternoon! The hive is buzzing 🐝" :
    "Good evening! Time to unwind 😌";
  VH.qs("#greeting-title").textContent = `What's the vibe today, ${VH.firstName(me)}? 👋`;
  VH.qs("#greeting-sub").textContent = moment;
  VH.qs("#prompt-avatar").innerHTML = VH.avatar(me, 40);

  /* Inline composer (desktop / tablet) */
  VH.qs("#composer-slot").appendChild(VH.buildComposer());

  /* Feed: the API only returns posts you're allowed to see */
  const feed = new VH.PostFeed(VH.qs("#feed"), {
    acceptNew: () => true,
    empty: VH.emptyState({
      emoji: "👀",
      title: "Your hive is quiet 👀",
      text: "Follow people and ask them to follow you back — once you follow each other, you'll see each other's vibes here.",
      action: `<a class="btn btn-primary" href="explore.html">${VH.icon("compass")} Find people</a>`,
    }),
  });
  feed.load("");

  // A new mutual follow unlocks their posts – refresh the feed
  document.addEventListener("vh:follow-changed", (e) => {
    if (e.detail.mutual || !e.detail.following) feed.load("");
  });
})();
