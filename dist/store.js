"use strict";
var Store;
(function (Store) {
    Store.KEYS = {
        session: "antrian.session",
        types: "antrian.types",
        tickets: "antrian.tickets",
        counters: "antrian.counters",
        seq: "antrian.seq",
        lastCall: "antrian.lastCall",
        myTickets: "antrian.myTickets",
    };
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    }
    Store.read = read;
    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (err) {
            console.error("Gagal menyimpan ke Local Storage:", err);
        }
    }
    Store.write = write;
    function remove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (err) {
            console.error("Gagal menghapus dari Local Storage:", err);
        }
    }
    Store.remove = remove;
    function watch(callback, intervalMs = 2500) {
        const onStorage = (e) => {
            if (e.key === null || e.key.startsWith("antrian."))
                callback();
        };
        window.addEventListener("storage", onStorage);
        const timer = window.setInterval(callback, intervalMs);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.clearInterval(timer);
        };
    }
    Store.watch = watch;
})(Store || (Store = {}));
