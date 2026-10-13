"use strict";
(() => {
    const session = Auth.guard();
    if (!session)
        return;
    UI.mountUserBox(session, UI.$("#userBox"));
    const grid = UI.$("#kioskTypes");
    const prioGrid = UI.$("#kioskPriorities");
    const takeBtn = UI.$("#takeBtn");
    const dlg = UI.$("#ticketDialog");
    let selectedType = null;
    let selectedPrio = "normal";
    function isPriority(value) {
        return value === "normal" || value === "lansia" || value === "disabilitas" || value === "vip";
    }
    function renderTypes() {
        const types = Queue.types().filter((t) => t.active);
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
    function renderPriorities() {
        prioGrid.innerHTML = Object.entries(Queue.PRIORITIES)
            .map(([id, p]) => `
        <button type="button" class="kiosk-prio${selectedPrio === id ? " is-selected" : ""}" data-id="${id}"
                aria-pressed="${selectedPrio === id}">${p.label}</button>`)
            .join("");
    }
    grid.addEventListener("click", (e) => {
        const btn = e.target.closest("button.kiosk-type");
        if (!btn)
            return;
        const id = btn.dataset.id;
        if (!id)
            return;
        selectedType = id;
        renderTypes();
    });
    prioGrid.addEventListener("click", (e) => {
        const btn = e.target.closest("button.kiosk-prio");
        if (!btn)
            return;
        const id = btn.dataset.id ?? "";
        if (!isPriority(id))
            return;
        selectedPrio = id;
        renderPriorities();
    });
    function showTicket(t) {
        UI.$("#dlgLabel").textContent = t.label;
        UI.$("#dlgTypeName").textContent = Queue.typeById(t.typeId)?.name ?? t.code;
        UI.$("#dlgPriority").innerHTML = UI.priorityChip(t.priority);
        UI.$("#dlgPosition").textContent = String(Queue.counts(t.typeId).waiting);
        UI.$("#dlgTime").textContent = UI.clock(t.createdAt);
        dlg.showModal();
    }
    takeBtn.addEventListener("click", () => {
        if (!selectedType) {
            UI.toast("Pilih jenis antrian terlebih dahulu.", "error");
            return;
        }
        const result = Queue.issue(selectedType, selectedPrio, "kiosk");
        if (!result.ok) {
            UI.toast(result.error, "error");
            renderTypes();
            return;
        }
        showTicket(result.value);
        renderTypes();
    });
    dlg.addEventListener("close", () => {
        selectedType = null;
        selectedPrio = "normal";
        renderTypes();
        renderPriorities();
    });
    Store.watch(renderTypes);
    renderTypes();
    renderPriorities();
})();
