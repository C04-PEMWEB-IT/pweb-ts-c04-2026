namespace Store {
  export const KEYS = {
    session: "antrian.session",
    types: "antrian.types",
    tickets: "antrian.tickets",
    counters: "antrian.counters",
    seq: "antrian.seq",
    lastCall: "antrian.lastCall",
    myTickets: "antrian.myTickets",
  } as const;

  export function read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  export function write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error("Gagal menyimpan ke Local Storage:", err);
    }
  }

  export function remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error("Gagal menghapus dari Local Storage:", err);
    }
  }

  // Sinkronisasi data: event `storage` (instan antar-tab) + polling berkala (2-3 detik).
  export function watch(callback: () => void, intervalMs = 2500): () => void {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === null || e.key.startsWith("antrian.")) callback();
    };
    window.addEventListener("storage", onStorage);
    const timer = window.setInterval(callback, intervalMs);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(timer);
    };
  }
}
