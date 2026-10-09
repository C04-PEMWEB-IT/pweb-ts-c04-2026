"use strict";
var Queue;
(function (Queue) {
    Queue.PRIORITIES = {
        vip: { label: "VIP", rank: 0 },
        disabilitas: { label: "Disabilitas", rank: 1 },
        lansia: { label: "Lansia", rank: 2 },
        normal: { label: "Normal", rank: 3 },
    };
    const SEED = [
        ["A", "UMUM-1"], ["B", "UMUM-2"], ["C", "UMUM-3"],
        ["G", "GIGI"], ["F", "FARMASI"], ["P", "PSIKOLOG"],
    ];
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const ok = (value) => ({ ok: true, value });
    const fail = (error) => ({ ok: false, error });
    Queue.types = () => Store.read(Store.KEYS.types, []);
    Queue.tickets = () => Store.read(Store.KEYS.tickets, []);
    const saveTypes = (v) => Store.write(Store.KEYS.types, v);
    const saveTickets = (v) => Store.write(Store.KEYS.tickets, v);
    const counters = () => Store.read(Store.KEYS.counters, {});
    function nextSeq() {
        const n = Store.read(Store.KEYS.seq, 0) + 1;
        Store.write(Store.KEYS.seq, n);
        return n;
    }
    Queue.typeById = (id) => Queue.types().find((t) => t.id === id);
    function ensureSeed() {
        if (localStorage.getItem(Store.KEYS.types) !== null)
            return;
        saveTypes(SEED.map(([code, name]) => ({ id: uid() + code, code, name, active: true })));
    }
    Queue.ensureSeed = ensureSeed;
    function addType(rawCode, rawName) {
        const code = rawCode.trim().toUpperCase();
        const name = rawName.trim().replace(/\s+/g, " ");
        if (!/^[A-Z]$/.test(code))
            return fail("Kode harus tepat 1 huruf kapital (A-Z).");
        if (name.length < 2 || name.length > 30)
            return fail("Nama layanan harus 2-30 karakter.");
        const list = Queue.types();
        if (list.some((t) => t.code.toUpperCase() === code))
            return fail(`Kode "${code}" sudah dipakai jenis antrian lain.`);
        if (list.some((t) => t.name.toLowerCase() === name.toLowerCase()))
            return fail(`Nama "${name}" sudah ada.`);
        const created = { id: uid(), code, name, active: true };
        saveTypes([...list, created]);
        return ok(created);
    }
    Queue.addType = addType;
    function toggleType(id) {
        const list = Queue.types();
        const t = list.find((x) => x.id === id);
        if (!t)
            return fail("Jenis antrian tidak ditemukan.");
        t.active = !t.active;
        saveTypes(list);
        return ok(t);
    }
    Queue.toggleType = toggleType;
    function deleteType(id) {
        const list = Queue.types();
        const t = list.find((x) => x.id === id);
        if (!t)
            return fail("Jenis antrian tidak ditemukan.");
        saveTypes(list.filter((x) => x.id !== id));
        saveTickets(Queue.tickets().filter((x) => x.typeId !== id));
        const c = counters();
        delete c[id];
        Store.write(Store.KEYS.counters, c);
        return ok(t);
    }
    Queue.deleteType = deleteType;
    function reset() {
        saveTickets([]);
        Store.write(Store.KEYS.counters, {});
        Store.write(Store.KEYS.seq, 0);
        Store.remove(Store.KEYS.lastCall);
    }
    Queue.reset = reset;
    function issue(typeId, priority, source) {
        const type = Queue.typeById(typeId);
        if (!type)
            return fail("Jenis antrian tidak ditemukan.");
        if (!type.active)
            return fail(`Jenis antrian ${type.name} sedang nonaktif.`);
        const c = counters();
        const number = (c[type.id] ?? 0) + 1;
        c[type.id] = number;
        Store.write(Store.KEYS.counters, c);
        const ticket = {
            id: uid(), typeId: type.id, code: type.code, number,
            label: `${type.code}-${String(number).padStart(3, "0")}`,
            priority, status: "waiting", seq: nextSeq(), createdAt: Date.now(), skips: 0, source,
        };
        saveTickets([...Queue.tickets(), ticket]);
        return ok(ticket);
    }
    Queue.issue = issue;
    function counts(typeId) {
        const out = { waiting: 0, called: 0, done: 0, skipped: 0 };
        for (const t of Queue.tickets())
            if (!typeId || t.typeId === typeId)
                out[t.status] += 1;
        return out;
    }
    Queue.counts = counts;
    ensureSeed();
})(Queue || (Queue = {}));
