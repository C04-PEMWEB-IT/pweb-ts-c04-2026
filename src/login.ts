(() => {
  const existing = Auth.session();
  const params = new URLSearchParams(window.location.search);
  if (existing && !params.has("reason")) {
    window.location.replace(Auth.homeFor(existing.role));
    return;
  }

  const form = UI.$<HTMLFormElement>("#loginForm");
  const userEl = UI.$<HTMLInputElement>("#username");
  const passEl = UI.$<HTMLInputElement>("#password");
  const submit = UI.$<HTMLButtonElement>("#submitBtn");
  const errorBox = UI.$("#loginError");
  const showPass = UI.$<HTMLInputElement>("#showPass");
  const accounts = UI.$("#accounts");

  const reasons: Record<string, string> = {
    forbidden: "Akun Anda tidak memiliki akses ke Dashboard Admin. Masuk dengan akun admin atau moderator.",
    login: "Silakan masuk dulu untuk membuka halaman tersebut.",
  };
  const reason = params.get("reason");
  if (reason && reasons[reason]) showError(reasons[reason], "info");

  function showError(message: string, kind: "error" | "info" = "error"): void {
    errorBox.textContent = message;
    errorBox.className = `form-error form-error-${kind}`;
    errorBox.hidden = false;
  }

  showPass.addEventListener("change", () => {
    passEl.type = showPass.checked ? "text" : "password";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const username = userEl.value.trim();
    const password = passEl.value;
    if (!username || !password) {
      showError("Username dan password wajib diisi.");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Memproses…";
    const result = await Auth.login(username, password);
    if (result.ok) {
      window.location.replace(Auth.homeFor(result.value.role));
      return;
    }
    showError(result.error);
    submit.disabled = false;
    submit.textContent = "Masuk";
    passEl.select();
  });

  // Bantuan akun uji dari endpoint filter per role.
  Auth.testAccounts()
    .then((data) => {
      const chips = (label: string, list: typeof data.admin): string =>
        list.map((u) =>
          `<button type="button" class="chip chip-pick" data-u="${UI.esc(u.username)}" data-p="${UI.esc(u.password)}">${label}: ${UI.esc(u.username)}</button>`
        ).join("");
      accounts.innerHTML = chips("admin", data.admin) + chips("user", data.user);
    })
    .catch(() => { accounts.textContent = ""; });

  accounts.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-u]");
    if (!btn) return;
    userEl.value = btn.dataset.u ?? "";
    passEl.value = btn.dataset.p ?? "";
    submit.focus();
  });
})();
