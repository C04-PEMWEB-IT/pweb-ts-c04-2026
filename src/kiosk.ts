// ============================================================
// ORANG 3 — kiosk.ts (halaman ambil-antrian.html)
// Revisi: halaman kini PROTECTED — wajib login (role user/admin/moderator).
//  - Pilih jenis antrian aktif + tingkat prioritas.
//  - Terbitkan tiket lewat Queue.issue(..., "kiosk") dengan
//    format nomor Kode-Nomor3Digit (contoh: A-001).
//  - Jenis antrian baru dari Dashboard Admin muncul otomatis
//    lewat Store.watch (polling ±2,5 detik) tanpa reload.
//  - Konfirmasi tiket ditampilkan sebagai dialog "struk".
// ============================================================

(() => {
  // Auth guard: redirect ke login.html bila belum login.
  const session = Auth.guard();
  if (!session) return;
  UI.mountUserBox(session, UI.$("#userBox"));

  const grid = UI.$("#kioskTypes");
  const prioGrid = UI.$("#kioskPriorities");
  const takeBtn = UI.$<HTMLButtonElement>("#takeBtn");
  const dlg = UI.$<HTMLDialogElement>("#ticketDialog");

  let selectedType: string | null = null;
  let selectedPrio: Priority = "normal";

  // Type guard (Modul 3 §6.5): memvalidasi nilai string dari data-* attribute
  // sebelum dipercaya sebagai Priority — tanpa `as`.
  function isPriority(value: string): value is Priority {
    return value === "normal" || value === "lansia" || value === "disabilitas" || value === "vip";
  }

  // ---------- langkah 1: jenis antrian aktif ----------
  function renderTypes(): void {
    const types = Queue.types().filter((t) => t.active);

    // Bersihkan pilihan bila jenis yang dipilih sudah dihapus/dinonaktifkan admin.
    if (selectedType && !types.some((t) => t.id === selectedType)) {
      selectedType = null;
    }

    if (!types.length) {
      grid.innerHTML = `<p class="empty">Belum ada jenis antrian aktif. Minta admin menambahkannya di Dashboard.</p>`;
      takeBtn.disabled = true;
      return;
    }
    takeBtn.disabled = false;

    grid.innerHTML = types.map((t) => `
      <button type="button" class="kiosk-type${selectedType === t.id ? " is-selected" : ""}" data-id="${t.id}"
              aria-pressed="${selectedType === t.id}">
        <span class="kiosk-code">${UI.esc(t.code)}</span>
        <span class="kiosk-name">${UI.esc(t.name)}</span>
        <span class="kiosk-wait">${Queue.counts(t.id).waiting} menunggu</span>
      </button>`).join("");
  }

  // ---------- langkah 2: prioritas (urutan rank: VIP → Normal) ----------
  function renderPriorities(): void {
    prioGrid.innerHTML = Object.entries(Queue.PRIORITIES)
      .map(([id, p]) => `
        <button type="button" class="kiosk-prio${selectedPrio === id ? " is-selected" : ""}" data-id="${id}"
                aria-pressed="${selectedPrio === id}">${p.label}</button>`)
      .join("");
  }

  grid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button.kiosk-type");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    selectedType = id;
    renderTypes();
  });

  prioGrid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button.kiosk-prio");
    if (!btn) return;
    const id = btn.dataset.id ?? "";
    if (!isPriority(id)) return;
    selectedPrio = id;
    renderPriorities();
  });

  // ---------- ambil nomor ----------
  function showTicket(t: Ticket): void {
    UI.$("#dlgLabel").textContent = t.label; // format Kode-Nomor3Digit dari Queue.issue
    UI.$("#dlgTypeName").textContent = Queue.typeById(t.typeId)?.name ?? t.code;
    UI.$("#dlgPriority").innerHTML = UI.priorityChip(t.priority);
    // Saya sendiri ikut terhitung "waiting", jadi nomor urut saya = jumlah waiting saat ini.
    UI.$("#dlgPosition").textContent = String(Queue.counts(t.typeId).waiting);
    UI.$("#dlgTime").textContent = UI.clock(t.createdAt);
    dlg.showModal();
  }

  takeBtn.addEventListener("click", () => {
    if (!selectedType) {
      UI.toast("Pilih jenis antrian terlebih dahulu.", "error");
      return;
    }
    // source "kiosk" = diambil sendiri oleh pengunjung (bukan tiket manual admin).
    const result = Queue.issue(selectedType, selectedPrio, "kiosk");
    if (!result.ok) {
      UI.toast(result.error, "error");
      renderTypes(); // segarkan daftar (mis. jenis barusan dinonaktifkan admin)
      return;
    }
    showTicket(result.value);
    renderTypes();
  });

  // Setelah dialog struk ditutup, siapkan layar untuk pengunjung berikutnya.
  dlg.addEventListener("close", () => {
    selectedType = null;
    selectedPrio = "normal";
    renderTypes();
    renderPriorities();
  });

  // ---------- pembaruan otomatis tanpa reload ----------
  // Event `storage` (instan antar-tab) + interval ±2,5 detik dari Store.watch,
  // sehingga jenis antrian baru/tiket dari tab lain langsung terlihat di sini.
  Store.watch(renderTypes);

  renderTypes();
  renderPriorities();
})();
