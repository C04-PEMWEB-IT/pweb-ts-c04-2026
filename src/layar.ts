// ============================================================
// ORANG 3 — layar.ts (halaman layar.html)
// Layar Antrian publik untuk monitor utama:
//  - Polling data tiap ±2,5 detik memakai Store.watch (event
//    `storage` + interval) tanpa reload halaman.
//  - Kartu untuk setiap jenis antrian aktif: nomor yang sedang
//    dipanggil, chip prioritas, dan jumlah antrian tersisa.
//  - Banner panggilan terakhir + jam.
//  - Bonus: tombol Layar Penuh (Fullscreen API) dan audio
//    panggilan (chime Web Audio + Web Speech API bahasa Indonesia).
// ============================================================

(() => {
  const grid = UI.$("#screenGrid");
  const banner = UI.$("#screenBanner");
  const clockEl = UI.$("#screenClock");
  const fsBtn = UI.$<HTMLButtonElement>("#fullscreenBtn");
  const soundBtn = UI.$<HTMLButtonElement>("#soundBtn");

  let lastSig = "";                 // signature render terakhir (dedup seperti admin/operator)
  let soundOn = false;              // audio aktif setelah tombol ditekan (kebijakan autoplay browser)
  let audioCtx: AudioContext | null = null;
  // Abaikan riwayat lama: catat panggilan terakhir yang sudah ada saat halaman dibuka,
  // sehingga suara hanya bunyi untuk panggilan yang terjadi selagi layar menyala.
  let lastSpokenAt = Store.read<CallEvent | null>(Store.KEYS.lastCall, null)?.at ?? 0;

  // ---------- render kartu per jenis antrian ----------
  function render(): void {
    const types = Queue.types().filter((t) => t.active);
    const sig = JSON.stringify([types, Queue.tickets()]);
    if (sig === lastSig) return; // render ulang hanya bila data berubah
    lastSig = sig;

    if (!types.length) {
      grid.innerHTML = `<p class="screen-empty">Belum ada jenis antrian aktif. Minta admin menambahkannya di Dashboard.</p>`;
      return;
    }

    grid.innerHTML = types.map((type) => {
      const cur = Queue.current(type.id);       // tiket berstatus "called"
      const waiting = Queue.counts(type.id).waiting;
      return `<section class="screen-card${cur ? " is-calling" : ""}">
        ${cur ? `<img src="assets/seno-senang.png" alt="" aria-hidden="true" class="card-seno">` : ""}
        <h2 class="screen-type">${UI.esc(type.name)} <span>(${UI.esc(type.code)})</span></h2>
        <p class="screen-number${cur ? "" : " is-empty"}">${cur ? UI.esc(cur.label) : "—"}</p>
        <p class="screen-meta">${cur ? UI.priorityChip(cur.priority) : "&nbsp;"}</p>
        <p class="screen-waiting"><strong>${waiting}</strong> menunggu</p>
      </section>`;
    }).join("");
  }

  // ---------- banner panggilan terakhir (dari Store.KEYS.lastCall) ----------
  // Isi ditulis ke .banner-content agar gambar balon kata SENO di banner tetap utuh.
  function renderBanner(): void {
    const host = banner.querySelector(".banner-content");
    if (!host) return;
    const e = Store.read<CallEvent | null>(Store.KEYS.lastCall, null);
    host.innerHTML = e
      ? `<span class="label">Panggilan terakhir</span><strong>${UI.esc(e.label)}</strong>
         <span>${UI.esc(e.typeName)}</span><span class="at">${UI.clock(e.at)}</span>`
      : `<span class="label">Panggilan terakhir</span><span>Belum ada</span>`;
  }

  // ---------- layar penuh (Fullscreen API) ----------
  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    document.documentElement.requestFullscreen().catch(() =>
      UI.toast("Layar penuh ditolak browser.", "error")
    );
  }

  fsBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    fsBtn.textContent = document.fullscreenElement ? "⛶ Keluar Layar Penuh" : "⛶ Layar Penuh";
  });

  // ---------- bonus audio: chime + suara pengumuman ----------
  // Dua nada pendek lewat Web Audio API (murni JS, tanpa file audio).
  function chime(): void {
    try {
      const ctx = audioCtx ?? new AudioContext();
      audioCtx = ctx;
      const now = ctx.currentTime;
      const notes: Array<[number, number]> = [[880, 0], [1174.66, 0.18]]; // A5 lalu D6
      for (const [freq, at] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + at);
        gain.gain.exponentialRampToValueAtTime(0.3, now + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + at);
        osc.stop(now + at + 0.4);
      }
    } catch {
      // Audio tidak tersedia / diblokir browser — layar tetap berfungsi tanpa suara.
    }
  }

  // Pengumuman suara memakai Web Speech API dengan bahasa Indonesia.
  function speak(event: CallEvent): void {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(`Nomor ${event.label.replace("-", " ")}, ${event.typeName}`);
    u.lang = "id-ID";
    u.rate = 0.9;
    window.speechSynthesis.cancel(); // hentikan ucapan sebelumnya agar tidak menumpuk
    window.speechSynthesis.speak(u);
  }

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊 Suara Aktif" : "🔇 Suara Mati";
    soundBtn.classList.toggle("is-on", soundOn);
    if (soundOn) {
      chime(); // sekalian membuka izin audio di browser (harus dari interaksi pengguna)
      if ("speechSynthesis" in window) {
        const hello = new SpeechSynthesisUtterance("Suara panggilan antrian diaktifkan");
        hello.lang = "id-ID";
        window.speechSynthesis.speak(hello);
      }
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  });

  // ---------- polling & sinkronisasi ----------
  function checkAnnouncement(): void {
    const event = Store.read<CallEvent | null>(Store.KEYS.lastCall, null);
    if (!event || event.at === lastSpokenAt) return;
    lastSpokenAt = event.at;
    if (soundOn) {
      chime();
      speak(event);
    }
  }

  function tick(): void {
    render();
    renderBanner();
    checkAnnouncement();
  }

  // Jam besar di pojok layar, diperbarui tiap detik.
  window.setInterval(() => {
    clockEl.textContent = UI.clock();
  }, 1000);

  // Polling data: event `storage` (instan antar-tab) + interval ±2,5 detik (Store.watch).
  Store.watch(tick);

  tick();
  clockEl.textContent = UI.clock();
})();
