namespace UI {
  export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
    return el;
  }

  const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]);

  export const clock = (ts: number = Date.now()): string =>
    new Date(ts).toLocaleTimeString("id-ID", { hour12: false });

  export const STATUS_LABEL: Record<TicketStatus, string> = {
    waiting: "Menunggu", called: "Dipanggil", done: "Selesai", skipped: "Dilewati",
  };

  export const statusChip = (s: TicketStatus): string =>
    `<span class="chip chip-${s}">${STATUS_LABEL[s]}</span>`;
  export const priorityChip = (p: Priority): string =>
    `<span class="chip chip-prio chip-prio-${p}">${Queue.PRIORITIES[p].label}</span>`;

  export function toast(message: string, kind: "ok" | "error" | "info" = "info"): void {
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

  export function confirmDialog(message: string, okLabel = "Ya, lanjutkan"): Promise<boolean> {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "modal";
      dlg.innerHTML = `<form method="dialog"><p>${esc(message)}</p>
        <div class="modal-actions">
          <button value="cancel" class="btn btn-ghost">Batal</button>
          <button value="ok" class="btn btn-danger-solid">${esc(okLabel)}</button>
        </div></form>`;
      dlg.addEventListener("close", () => {
        resolve(dlg.returnValue === "ok");
        dlg.remove();
      });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  export function mountUserBox(session: AuthSession, host: HTMLElement): void {
    host.innerHTML = `<span class="user-name">${esc(session.firstName)}</span>
      <span class="chip chip-role">${esc(session.role)}</span>
      <button class="btn btn-ghost btn-sm" id="logoutBtn" type="button">Keluar</button>`;
    $("#logoutBtn", host).addEventListener("click", Auth.logout);
  }
}
