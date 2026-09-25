/* ==========================================================================
   auth.js — login and registration pages
   ========================================================================== */

(() => {
  const loginForm = VH.qs("#login-form");
  const registerForm = VH.qs("#register-form");
  const alertBox = VH.qs("#form-alert");

  const params = new URLSearchParams(location.search);

  // Already logged in? Go straight back into your own hive.
  if (API.session.token && !params.has("switch")) {
    location.replace("index.html");
    return;
  }

  /* Shared page chrome: logos, theme toggle, flash message */
  VH.qsa("[data-logo]").forEach((el) => el.insertAdjacentHTML("afterbegin", VH.logo()));
  VH.qs(".theme-toggle-slot").outerHTML = VH.themeButton("btn-icon");
  VH.showFlash();

  /* Show / hide password */
  VH.qsa("[data-toggle-password]").forEach((btn) => {
    const input = btn.parentElement.querySelector("input");
    const render = () => {
      const hidden = input.type === "password";
      btn.innerHTML = VH.icon(hidden ? "eye" : "eyeOff");
      btn.setAttribute("aria-label", hidden ? "Show password" : "Hide password");
    };
    btn.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      render();
      input.focus();
    });
    render();
  });

  /* ---------- error display helpers ---------- */
  function showAlert(message) {
    alertBox.innerHTML = `${VH.icon("alert")}<span>${VH.esc(message)}</span>`;
    alertBox.classList.add("show");
  }

  function clearErrors(form) {
    alertBox.classList.remove("show");
    VH.qsa(".field", form).forEach((f) => f.classList.remove("has-error"));
    VH.qsa("[data-error-for]", form).forEach((el) => (el.textContent = ""));
  }

  function setFieldError(form, name, message) {
    const el = VH.qs(`[data-error-for="${name}"]`, form);
    if (!el) return false;
    el.textContent = message;
    el.closest(".field").classList.add("has-error");
    return true;
  }

  /** Map DRF field errors ({"email": ["..."]}) onto the form. */
  function showServerErrors(form, err) {
    let placed = false;
    Object.entries(err.data || {}).forEach(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : String(messages);
      if (setFieldError(form, field, text)) placed = true;
    });
    if (!placed) showAlert(err.message);
  }

  /** Only allow redirects to our own pages (prevents open redirects). */
  function safeNext() {
    const next = new URLSearchParams(location.search).get("next") || "";
    return /^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next) ? next : "index.html";
  }

  VH.qsa("input").forEach((input) =>
    input.addEventListener("input", () => {
      input.closest(".field")?.classList.remove("has-error");
      const err = VH.qs(`[data-error-for="${input.name}"]`);
      if (err) err.textContent = "";
    })
  );

  /* ---------- Saved accounts ("Continue as …") ---------- */
  const chooser = VH.qs("#saved-accounts");
  const loginSub = VH.qs("#login-sub");

  function showForm(prefill = "") {
    chooser.hidden = true;
    loginForm.hidden = false;
    loginSub.textContent = "Log in to see what's buzzing in your hive.";
    if (API.accounts.list().length && !VH.qs("[data-back]", loginForm)) {
      loginForm.insertAdjacentHTML("afterbegin",
        `<button class="back-link" type="button" data-back>${VH.icon("arrowLeft", "icon-sm")} Saved accounts</button>`);
      VH.qs("[data-back]", loginForm).addEventListener("click", showChooser);
    }
    if (prefill) loginForm.identifier.value = prefill;
    (prefill ? loginForm.password : loginForm.identifier).focus();
  }

  function showChooser() {
    const saved = API.accounts.list();
    if (!saved.length) return showForm();
    clearErrors(loginForm);
    loginForm.hidden = true;
    chooser.hidden = false;
    loginSub.textContent = "Choose an account to continue.";
    chooser.innerHTML = `
      <div class="saved-list">
        ${saved.map((a) => `
          <div class="saved-row">
            <button class="account-item" type="button" data-account="${a.id}">
              ${VH.avatar(a, 48)}
              <span class="meta"><span class="name">${VH.esc(VH.displayName(a))}</span><span class="handle">@${VH.esc(a.username)}</span></span>
              ${a.token ? `<span class="continue">Continue ${VH.icon("arrowLeft", "icon-sm flip")}</span>` : '<span class="needs-login">Log in</span>'}
            </button>
            <button class="btn-icon" type="button" data-forget="${a.id}" aria-label="Remove @${VH.esc(a.username)} from this device" title="Remove from this device">${VH.icon("x", "icon-sm")}</button>
          </div>`).join("")}
      </div>
      <button class="btn btn-outline btn-block" type="button" data-other>${VH.icon("userPlus", "icon-sm")} Log in with another account</button>`;
  }

  if (chooser) {
    chooser.addEventListener("click", (e) => {
      const forget = e.target.closest("[data-forget]");
      if (forget) {
        API.accounts.remove(Number(forget.dataset.forget));
        VH.toast("Account removed from this device.");
        return showChooser();
      }
      if (e.target.closest("[data-other]")) return showForm();
      const pick = e.target.closest("[data-account]");
      if (!pick) return;
      const account = API.accounts.list().find((a) => String(a.id) === pick.dataset.account);
      if (account.token) {
        pick.disabled = true;
        VH.switchTo(account);
      } else {
        showForm(account.username);
      }
    });

    if (params.get("u")) showForm(params.get("u"));
    else if (params.has("add")) showForm();
    else showChooser();
  }

  /* ---------- Login ---------- */
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(loginForm);
    const identifier = loginForm.identifier.value.trim();
    const password = loginForm.password.value;
    let valid = true;
    if (!identifier) { setFieldError(loginForm, "identifier", "Enter your username or email."); valid = false; }
    if (!password) { setFieldError(loginForm, "password", "Enter your password."); valid = false; }
    if (!valid) return;

    const button = VH.qs("button[type=submit]", loginForm);
    VH.setLoading(button, true, "Logging in...");
    try {
      const data = await API.request("/login/", { method: "POST", body: { identifier, password }, auth: false });
      API.session.save(data.token, data.user);
      VH.flash(`Welcome back, ${VH.firstName(data.user)}! 🐝`);
      location.href = safeNext();
    } catch (err) {
      showAlert(err.message);
      VH.setLoading(button, false);
    }
  });

  /* ---------- Register ---------- */
  if (registerForm) {
    const strength = VH.qs("#strength");
    const strengthLabel = VH.qs("#strength-label");
    const labels = ["Use 8+ characters with a mix of letters, numbers & symbols.", "Weak", "Okay", "Good", "Strong 💪"];

    registerForm.password.addEventListener("input", () => {
      const value = registerForm.password.value;
      let score = 0;
      if (value.length >= 8) score++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value) || value.length >= 14) score++;
      const level = value ? Math.max(1, score) : 0;
      strength.dataset.level = level;
      strengthLabel.textContent = labels[level];
    });

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(registerForm);
      const values = Object.fromEntries(new FormData(registerForm));
      values.username = values.username.trim();
      values.email = values.email.trim();
      values.full_name = values.full_name.trim();

      // Client-side checks mirror the server rules for instant feedback
      const errors = {};
      if (!/^[\w.@+-]{3,30}$/.test(values.username))
        errors.username = "3–30 characters: letters, numbers and . _ @ + - only.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
      if (values.password.length < 8) errors.password = "Password must be at least 8 characters.";
      else if (/^\d+$/.test(values.password)) errors.password = "Password can't be entirely numeric.";
      if (values.password !== values.password_confirm) errors.password_confirm = "Passwords do not match.";

      if (Object.keys(errors).length) {
        Object.entries(errors).forEach(([field, msg]) => setFieldError(registerForm, field, msg));
        VH.qs(".has-error input", registerForm)?.focus();
        return;
      }

      const button = VH.qs("button[type=submit]", registerForm);
      VH.setLoading(button, true, "Creating your hive...");
      try {
        const data = await API.request("/register/", { method: "POST", body: values, auth: false });
        API.session.save(data.token, data.user);
        VH.flash(`Welcome to the hive, ${VH.firstName(data.user)}! 🐝`);
        location.href = "index.html";
      } catch (err) {
        showServerErrors(registerForm, err);
        VH.setLoading(button, false);
      }
    });
  }
})();
