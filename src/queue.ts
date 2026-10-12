// Logika data antrian: jenis antrian, tiket, reset, dan pemanggilan oleh operator.
namespace Queue {
  export const PRIORITIES: Record<Priority, { label: string; rank: number }> = {
    vip: { label: "VIP", rank: 0 },
    disabilitas: { label: "Disabilitas", rank: 1 },
    lansia: { label: "Lansia", rank: 2 },
    normal: { label: "Normal", rank: 3 },
  };

  const SEED: Array<[string, string]> = [
    ["A", "UMUM-1"], ["B", "UMUM-2"], ["C", "UMUM-3"],
    ["G", "GIGI"], ["F", "FARMASI"], ["P", "PSIKOLOG"],
  ];

  const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ok = <T>(value: T): Result<T> => ({ ok: true, value });
  const fail = <T>(error: string): Result<T> => ({ ok: false, error });

  // ---------- data ----------
  export const types = (): QueueType[] => Store.read<QueueType[]>(Store.KEYS.types, []);
  export const tickets = (): Ticket[] => Store.read<Ticket[]>(Store.KEYS.tickets, []);
  const saveTypes = (v: QueueType[]): void => Store.write(Store.KEYS.types, v);
  const saveTickets = (v: Ticket[]): void => Store.write(Store.KEYS.tickets, v);
  const counters = (): Record<string, number> => Store.read<Record<string, number>>(Store.KEYS.counters, {});

  function nextSeq(): number {
    const n = Store.read<number>(Store.KEYS.seq, 0) + 1;
    Store.write(Store.KEYS.seq, n);
    return n;
  }

  export const typeById = (id: string): QueueType | undefined => types().find((t) => t.id === id);

  // Isi awal supaya dashboard tidak kosong saat pertama dibuka.
  export function ensureSeed(): void {
    if (localStorage.getItem(Store.KEYS.types) !== null) return;
    saveTypes(SEED.map(([code, name]) => ({ id: uid() + code, code, name, active: true })));
  }

  // ---------- jenis antrian (CRUD) ----------
  export function addType(rawCode: string, rawName: string): Result<QueueType> {
    const code = rawCode.trim().toUpperCase();
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!/^[A-Z]$/.test(code)) return fail("Kode harus tepat 1 huruf kapital (A-Z).");
    if (name.length < 2 || name.length > 30) return fail("Nama layanan harus 2-30 karakter.");
    const list = types();
    if (list.some((t) => t.code.toUpperCase() === code)) return fail(`Kode "${code}" sudah dipakai jenis antrian lain.`);
    if (list.some((t) => t.name.toLowerCase() === name.toLowerCase())) return fail(`Nama "${name}" sudah ada.`);
    const created: QueueType = { id: uid(), code, name, active: true };
    saveTypes([...list, created]);
    return ok(created);
  }

  export function toggleType(id: string): Result<QueueType> {
    const list = types();
    const t = list.find((x) => x.id === id);
    if (!t) return fail("Jenis antrian tidak ditemukan.");
    t.active = !t.active;
    saveTypes(list);
    return ok(t);
  }

  export function deleteType(id: string): Result<QueueType> {
    const list = types();
    const t = list.find((x) => x.id === id);
    if (!t) return fail("Jenis antrian tidak ditemukan.");
    saveTypes(list.filter((x) => x.id !== id));
    saveTickets(tickets().filter((x) => x.typeId !== id));
    const c = counters();
    delete c[id];
    Store.write(Store.KEYS.counters, c);
    return ok(t);
  }

  // Kosongkan semua tiket dan kembalikan nomor ke 001. Jenis antrian tetap ada.
  export function reset(): void {
    saveTickets([]);
    Store.write(Store.KEYS.counters, {});
    Store.write(Store.KEYS.seq, 0);
    Store.remove(Store.KEYS.lastCall);
  }

  // ---------- tiket ----------
  // Dipakai admin (source "admin") dan nanti halaman ambil-antrian (source "kiosk").
  export function issue(typeId: string, priority: Priority, source: Ticket["source"]): Result<Ticket> {
    const type = typeById(typeId);
    if (!type) return fail("Jenis antrian tidak ditemukan.");
    if (!type.active) return fail(`Jenis antrian ${type.name} sedang nonaktif.`);
    const c = counters();
    const number = (c[type.id] ?? 0) + 1;
    c[type.id] = number;
    Store.write(Store.KEYS.counters, c);
    const ticket: Ticket = {
      id: uid(), typeId: type.id, code: type.code, number,
      label: `${type.code}-${String(number).padStart(3, "0")}`,
      priority, status: "waiting", seq: nextSeq(), createdAt: Date.now(), skips: 0, source,
    };
    saveTickets([...tickets(), ticket]);
    return ok(ticket);
  }

  export function counts(typeId?: string): Record<TicketStatus, number> {
    const out: Record<TicketStatus, number> = { waiting: 0, called: 0, done: 0, skipped: 0 };
    for (const t of tickets()) if (!typeId || t.typeId === typeId) out[t.status] += 1;
    return out;
  }

  // ---------- operator: pemanggilan antrian ----------
  // Urutan panggil: prioritas (VIP > Disabilitas > Lansia > Normal), lalu FIFO berdasarkan seq.
  export const waiting = (typeId?: string): Ticket[] =>
    tickets().filter((t) => t.status === "waiting" && (!typeId || t.typeId === typeId));

  export const current = (typeId: string): Ticket | null =>
    tickets().find((t) => t.typeId === typeId && t.status === "called") ?? null;

  export const nextTicket = (typeId?: string): Ticket | null =>
    [...waiting(typeId)].sort((a, b) => {
      const ra = PRIORITIES[a.priority].rank;
      const rb = PRIORITIES[b.priority].rank;
      return ra !== rb ? ra - rb : a.seq - b.seq;
    })[0] ?? null;

  // Catat tiket yang baru dipanggil untuk ditampilkan di layar antrian.
  function announce(t: Ticket): void {
    Store.write(Store.KEYS.lastCall, { label: t.label, typeName: typeById(t.typeId)?.name ?? t.code, at: Date.now() } as CallEvent);
  }

  // Ubah tiket "waiting" menjadi "called" (sedang dipanggil).
  export function callTicket(id: string): Result<Ticket> {
    const list = tickets();
    const t = list.find((x) => x.id === id);
    if (!t) return fail("Tiket tidak ditemukan.");
    if (t.status !== "waiting") return fail("Tiket tidak sedang menunggu.");
    t.status = "called";
    t.calledAt = Date.now();
    saveTickets(list);
    announce(t);
    return ok(t);
  }

  // Selesaikan tiket aktif lalu panggil antrian berikutnya (tombol "Panggil Berikutnya").
  export function callNext(typeId: string): Result<Ticket | null> {
    const cur = current(typeId);
    if (cur) closeTicket(cur.id, "done");
    const next = nextTicket(typeId);
    if (!next) return ok(null);
    const r = callTicket(next.id);
    return r.ok ? ok(r.value) : r;
  }

  // Tutup tiket aktif tanpa memanggil antrian baru (tombol "Selesai").
  export function finish(typeId: string): Result<Ticket> {
    const cur = current(typeId);
    if (!cur) return fail("Tidak ada tiket yang sedang dipanggil.");
    const row = closeTicket(cur.id, "done");
    return row ? ok(row) : fail("Tiket tidak ditemukan.");
  }

  // Tandai tiket yang tidak hadir sebagai "Dilewati" (tombol "Lewati").
  export function skip(typeId: string): Result<Ticket> {
    const cur = current(typeId);
    if (!cur) return fail("Tidak ada tiket yang sedang dipanggil.");
    const list = tickets();
    const row = list.find((x) => x.id === cur.id);
    if (!row) return fail("Tiket tidak ditemukan.");
    row.status = "skipped";
    row.skips += 1;
    row.closedAt = Date.now();
    saveTickets(list);
    return ok(row);
  }

  // Panggil ulang tiket aktif (perbarui pengumuman tanpa mengubah status).
  export function recall(typeId: string): Result<Ticket> {
    const cur = current(typeId);
    if (!cur) return fail("Tidak ada tiket yang sedang dipanggil.");
    announce(cur);
    return ok(cur);
  }

  // Penutup bersama: ubah status tiket aktif dan simpan.
  function closeTicket(id: string, status: TicketStatus): Ticket | null {
    const list = tickets();
    const t = list.find((x) => x.id === id);
    if (!t) return null;
    t.status = status;
    t.closedAt = Date.now();
    saveTickets(list);
    return t;
  }

  ensureSeed();
}
