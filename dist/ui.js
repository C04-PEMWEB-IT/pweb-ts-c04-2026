"use strict";
var UI;
(function (UI) {
    function $(selector, root = document) {
        const el = root.querySelector(selector);
        if (!el)
            throw new Error(`Elemen tidak ditemukan: ${selector}`);
        return el;
    }
    UI.$ = $;
    const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    UI.esc = (s) => s.replace(/[&<>"']/g, (c) => ESC[c]);
    UI.clock = (ts = Date.now()) => new Date(ts).toLocaleTimeString("id-ID", { hour12: false });
    UI.STATUS_LABEL = {
        waiting: "Menunggu", called: "Dipanggil", done: "Selesai", skipped: "Dilewati",
    };
    UI.statusChip = (s) => `<span class="chip chip-${s}">${UI.STATUS_LABEL[s]}</span>`;
    UI.priorityChip = (p) => `<span class="chip chip-prio chip-prio-${p}">${Queue.PRIORITIES[p].label}</span>`;
    function toast(message, kind = "info") {
        let box = document.getElementById("toasts");
        if (!box) {
            box = document.createElement("div");
            box.id = "toasts";
            box.setAttribute("role", "status");
            box.setAttribute("aria-live", "polite");
            document.body.appendChild(box);
        }
        const t = document.createElement("div");
        t.className = `toast toast-${kind}`;
        t.textContent = message;
        box.appendChild(t);
        window.setTimeout(() => t.remove(), 3200);
    }
    UI.toast = toast;
    function confirmDialog(message, okLabel = "Ya, lanjutkan") {
        return new Promise((resolve) => {
            const dlg = document.createElement("dialog");
            dlg.className = "modal";
            dlg.innerHTML = `<form method="dialog"><p>${UI.esc(message)}</p>
        <div class="modal-actions">
          <button value="cancel" class="btn btn-ghost">Batal</button>
          <button value="ok" class="btn btn-danger-solid">${UI.esc(okLabel)}</button>
        </div></form>`;
            dlg.addEventListener("close", () => {
                resolve(dlg.returnValue === "ok");
                dlg.remove();
            });
            document.body.appendChild(dlg);
            dlg.showModal();
        });
    }
    UI.confirmDialog = confirmDialog;
    function mountUserBox(session, host) {
        host.innerHTML = `<span class="user-name">${UI.esc(session.firstName)}</span>
      <span class="chip chip-role">${UI.esc(session.role)}</span>
      <button class="btn btn-ghost btn-sm" id="logoutBtn" type="button">Keluar</button>`;
        $("#logoutBtn", host).addEventListener("click", Auth.logout);
    }
    UI.mountUserBox = mountUserBox;
})(UI || (UI = {}));
