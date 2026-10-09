(() => {
  // Auth guard + role guard: hanya admin/moderator yang boleh di sini.
  const session = Auth.guard({ staffOnly: true });
  if (!session) return;
  UI.mountUserBox(session, UI.$("#userBox"));

  const statsEl = UI.$("#stats");
  const typeList = UI.$("#typeList");
  const ticketList = UI.$("#ticketList");
  const typeForm = UI.$<HTMLFormElement>("#typeForm");
  const codeEl = UI.$<HTMLInputElement>("#typeCode");
  const nameEl = UI.$<HTMLInputElement>("#typeName");
  const typeError = UI.$("#typeError");
  const issueForm = UI.$<HTMLFormElement>("#issueForm");
  const typeSelect = UI.$<HTMLSelectElement>("#typeSelect");
  const prioSelect = UI.$<HTMLSelectElement>("#prioSelect");

  let lastSig = "";

  function render(force = false): void {
    const types = Queue.types();
    const tickets = Queue.tickets();
    const sig = JSON.stringify([types, tickets]);
    if (!force && sig === lastSig) return; // render ulang hanya bila data berubah
    lastSig = sig;
    renderStats();
    renderTypes(types);
    renderSelect(types);
    renderTickets(types, tickets);
  }

  function renderStats(): void {
    const c = Queue.counts();
    const item = (n: number, label: string): string => `<div class="stat"><strong>${n}</strong><span>${label}</span></div>`;
    statsEl.innerHTML = item(c.waiting, "Menunggu") + item(c.called, "Sedang dipanggil") + item(c.done, "Selesai") + item(c.skipped, "Dilewati");
  }

  function renderTypes(types: QueueType[]): void {
    if (!types.length) {
      typeList.innerHTML = `<li class="empty">Belum ada jenis antrian. Tambahkan lewat form di atas.</li>`;
      return;
    }
    typeList.innerHTML = types.map((t) => `
      <li class="type-row${t.active ? "" : " is-off"}">
        <div>
          <strong>${UI.esc(t.name)}</strong> <span class="muted">(${UI.esc(t.code)})</span>
          ${t.active ? "" : `<span class="chip chip-off">Nonaktif</span>`}
          <div class="muted small">${Queue.counts(t.id).waiting} menunggu</div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${t.id}">${t.active ? "Nonaktifkan" : "Aktifkan"}</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}">Hapus</button>
        </div>
      </li>`).join("");
  }

  // Hanya jenis antrian aktif yang bisa dipilih untuk tiket baru.
  function renderSelect(types: QueueType[]): void {
    const prev = typeSelect.value;
    typeSelect.innerHTML = `<option value="">Pilih jenis antrian</option>` +
      types.filter((t) => t.active).map((t) => `<option value="${t.id}">${UI.esc(t.name)} (${UI.esc(t.code)})</option>`).join("");
    typeSelect.value = Array.from(typeSelect.options).some((o) => o.value === prev) ? prev : "";
  }

  // Daftar tiket hanya untuk dilihat. Tombol Panggil/Lewati/Selesai dibuat Orang 2.
  function renderTickets(types: QueueType[], tickets: Ticket[]): void {
    if (!types.length) {
      ticketList.innerHTML = `<p class="empty">Belum ada jenis antrian.</p>`;
      return;
    }
    ticketList.innerHTML = types.map((t) => {
      const rows = tickets.filter((x) => x.typeId === t.id).sort((a, b) => b.seq - a.seq);
      const body = rows.length
        ? rows.map((x) => `<div class="ticket-row">
            <strong class="ticket-label">${x.label}</strong>${UI.priorityChip(x.priority)}${UI.statusChip(x.status)}</div>`).join("")
        : `<div class="empty small">Belum ada tiket.</div>`;
      return `<section class="group"><h4>${UI.esc(t.name)}</h4>${body}</section>`;
    }).join("");
  }

  // ----- jenis antrian: tambah -----
  codeEl.addEventListener("input", () => { codeEl.value = codeEl.value.toUpperCase(); });

  typeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = Queue.addType(codeEl.value, nameEl.value);
    if (!result.ok) {
      typeError.textContent = result.error;
      typeError.hidden = false;
      codeEl.setAttribute("aria-invalid", "true");
      return;
    }
    typeError.hidden = true;
    codeEl.removeAttribute("aria-invalid");
    typeForm.reset();
    codeEl.focus();
    UI.toast(`Jenis antrian ${result.value.name} ditambahkan.`, "ok");
    render(true);
  });

  // ----- jenis antrian: aktifkan/nonaktifkan, hapus -----
  typeList.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id ?? "";
    if (btn.dataset.action === "toggle") {
      const r = Queue.toggleType(id);
      if (r.ok) UI.toast(`${r.value.name} ${r.value.active ? "diaktifkan" : "dinonaktifkan"}.`, "info");
    } else if (btn.dataset.action === "delete") {
      const t = Queue.typeById(id);
      if (!t) return;
      const yes = await UI.confirmDialog(`Hapus jenis antrian ${t.name}? Semua tiketnya ikut terhapus.`, "Hapus");
      if (!yes) return;
      Queue.deleteType(id);
      UI.toast(`${t.name} dihapus.`, "ok");
    }
    render(true);
  });

  // ----- terbitkan tiket manual -----
  issueForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!typeSelect.value) {
      UI.toast("Pilih jenis antrian terlebih dahulu.", "error");
      typeSelect.focus();
      return;
    }
    const r = Queue.issue(typeSelect.value, prioSelect.value as Priority, "admin");
    if (!r.ok) { UI.toast(r.error, "error"); return; }
    UI.toast(`Tiket ${r.value.label} diterbitkan (${Queue.PRIORITIES[r.value.priority].label}).`, "ok");
    render(true);
  });

  // ----- reset antrian -----
  UI.$("#resetBtn").addEventListener("click", async () => {
    const yes = await UI.confirmDialog("Reset antrian? Semua tiket dihapus dan nomor kembali ke 001.", "Reset");
    if (!yes) return;
    Queue.reset();
    UI.toast("Antrian direset. Penomoran mulai dari awal.", "ok");
    render(true);
  });

  render(true);
  Store.watch(() => render()); // sinkron bila ada perubahan dari tab lain
})();
