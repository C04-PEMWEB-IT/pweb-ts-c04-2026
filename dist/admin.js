"use strict";
(() => {
    const session = Auth.guard({ staffOnly: true });
    if (!session)
        return;
    UI.mountUserBox(session, UI.$("#userBox"));
    const statsEl = UI.$("#stats");
    const typeList = UI.$("#typeList");
    const ticketList = UI.$("#ticketList");
    const typeForm = UI.$("#typeForm");
    const codeEl = UI.$("#typeCode");
    const nameEl = UI.$("#typeName");
    const typeError = UI.$("#typeError");
    const issueForm = UI.$("#issueForm");
    const typeSelect = UI.$("#typeSelect");
    const prioSelect = UI.$("#prioSelect");
    let lastSig = "";
    function render(force = false) {
        const types = Queue.types();
        const tickets = Queue.tickets();
        const sig = JSON.stringify([types, tickets]);
        if (!force && sig === lastSig)
            return;
        lastSig = sig;
        renderStats();
        renderTypes(types);
        renderSelect(types);
        renderTickets(types, tickets);
    }
    function renderStats() {
        const c = Queue.counts();
        const item = (n, label) => `<div class="stat"><strong>${n}</strong><span>${label}</span></div>`;
        statsEl.innerHTML = item(c.waiting, "Menunggu") + item(c.called, "Sedang dipanggil") + item(c.done, "Selesai") + item(c.skipped, "Dilewati");
    }
    function renderTypes(types) {
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
    function renderSelect(types) {
        const prev = typeSelect.value;
        typeSelect.innerHTML = `<option value="">Pilih jenis antrian</option>` +
            types.filter((t) => t.active).map((t) => `<option value="${t.id}">${UI.esc(t.name)} (${UI.esc(t.code)})</option>`).join("");
        typeSelect.value = Array.from(typeSelect.options).some((o) => o.value === prev) ? prev : "";
    }
    function renderTickets(types, tickets) {
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
    typeList.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn)
            return;
        const id = btn.dataset.id ?? "";
        if (btn.dataset.action === "toggle") {
            const r = Queue.toggleType(id);
            if (r.ok)
                UI.toast(`${r.value.name} ${r.value.active ? "diaktifkan" : "dinonaktifkan"}.`, "info");
        }
        else if (btn.dataset.action === "delete") {
            const t = Queue.typeById(id);
            if (!t)
                return;
            const yes = await UI.confirmDialog(`Hapus jenis antrian ${t.name}? Semua tiketnya ikut terhapus.`, "Hapus");
            if (!yes)
                return;
            Queue.deleteType(id);
            UI.toast(`${t.name} dihapus.`, "ok");
        }
        render(true);
    });
    issueForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!typeSelect.value) {
            UI.toast("Pilih jenis antrian terlebih dahulu.", "error");
            typeSelect.focus();
            return;
        }
        const r = Queue.issue(typeSelect.value, prioSelect.value, "admin");
        if (!r.ok) {
            UI.toast(r.error, "error");
            return;
        }
        UI.toast(`Tiket ${r.value.label} diterbitkan (${Queue.PRIORITIES[r.value.priority].label}).`, "ok");
        render(true);
    });
    UI.$("#resetBtn").addEventListener("click", async () => {
        const yes = await UI.confirmDialog("Reset antrian? Semua tiket dihapus dan nomor kembali ke 001.", "Reset");
        if (!yes)
            return;
        Queue.reset();
        UI.toast("Antrian direset. Penomoran mulai dari awal.", "ok");
        render(true);
    });
    render(true);
    Store.watch(() => render());
})();
