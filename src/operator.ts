(() => {
  // Revisi role access: Panel Operator hanya untuk admin/moderator.
  const session = Auth.guard({ staffOnly: true });
  if (!session) return;
  UI.mountUserBox(session, UI.$("#userBox"));

  const grid = UI.$("#operatorGrid");
  let lastSig = "";

  function render(force = false): void {
    const types = Queue.types().filter((t) => t.active);
    const tickets = Queue.tickets();
    const sig = JSON.stringify([types, tickets]);
    if (!force && sig === lastSig) return;
    lastSig = sig;

    if (!types.length) {
      grid.innerHTML = `<p class="empty">Belum ada jenis antrian aktif. Minta admin menambahkannya di Dashboard.</p>`;
      return;
    }

    grid.innerHTML = types.map((type) => {
      const cur = Queue.current(type.id);
      const next = Queue.nextTicket(type.id);
      const waitingCount = Queue.counts(type.id).waiting;
      return `<section class="card operator-card">
        <div class="list-head">
          <h2>${UI.esc(type.name)} <span class="muted">(${UI.esc(type.code)})</span></h2>
          <span class="chip">${waitingCount} menunggu</span>
        </div>
        <div class="call-now">
          <span class="muted small">Sedang dipanggil</span>
          <strong class="call-number${cur ? "" : " is-empty"}">${cur ? UI.esc(cur.label) : "—"}</strong>
          ${cur ? UI.priorityChip(cur.priority) : ""}
        </div>
        <div class="call-next">
          <span class="muted small">Berikutnya</span>
          <span class="call-next-value">${next ? UI.esc(next.label) : "—"}${next ? UI.priorityChip(next.priority) : ""}</span>
        </div>
        <div class="row-actions operator-actions">
          <button class="btn btn-call btn-sm" data-action="call" data-id="${type.id}"${next ? "" : " disabled"}>Panggil Berikutnya</button>
          <button class="btn btn-ghost btn-sm" data-action="recall" data-id="${type.id}"${cur ? "" : " disabled"}>Panggil Ulang</button>
          <button class="btn btn-danger btn-sm" data-action="skip" data-id="${type.id}"${cur ? "" : " disabled"}>Lewati</button>
          <button class="btn btn-primary btn-sm" data-action="finish" data-id="${type.id}"${cur ? "" : " disabled"}>Selesai</button>
        </div>
      </section>`;
    }).join("");
  }

  grid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.id ?? "";
    const action = btn.dataset.action;

    let result: Result<unknown>;
    if (action === "call") result = Queue.callNext(id);
    else if (action === "recall") result = Queue.recall(id);
    else if (action === "skip") result = Queue.skip(id);
    else if (action === "finish") result = Queue.finish(id);
    else return;

    if (!result.ok) UI.toast(result.error, "error");
    render(true);
  });

  render(true);
  Store.watch(() => render());
})();
