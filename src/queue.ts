// Logika data antrian. Orang 1 mengisi bagian jenis antrian, tiket manual, dan reset.
// TODO Orang 2: tambahkan fungsi waiting, current, callTicket, callNext, finish, skip, recall di namespace ini.
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

  ensureSeed();
}
